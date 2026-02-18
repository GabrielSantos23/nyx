use napi::bindgen_prelude::*;
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;

pub struct SystemAudioBackend {
    running: Arc<AtomicBool>,
    handle: Option<thread::JoinHandle<()>>,
}

impl SystemAudioBackend {
    pub fn new(_device_id: Option<String>) -> Self {
        SystemAudioBackend {
            running: Arc::new(AtomicBool::new(false)),
            handle: None,
        }
    }

    pub fn start(&mut self, callback: impl Fn(Vec<f32>) + Send + 'static) -> Result<()> {
        if self.running.load(Ordering::SeqCst) {
            return Err(Error::from_reason("Already running"));
        }

        self.running.store(true, Ordering::SeqCst);
        let running = Arc::clone(&self.running);

        self.handle = Some(thread::spawn(move || {
            if let Err(e) = run_audio_loopback(running, callback) {
                eprintln!("Audio loopback error: {:?}", e);
            }
        }));

        Ok(())
    }

    pub fn stop(&mut self) -> Result<()> {
        self.running.store(false, Ordering::SeqCst);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
        Ok(())
    }
}

fn run_audio_loopback(running: Arc<AtomicBool>, callback: impl Fn(Vec<f32>) + Send) -> Result<()> {
    use wasapi::*;

    let _ = initialize_mta();

    let enumerator = DeviceEnumerator::new()
        .map_err(|e| Error::from_reason(format!("DeviceEnumerator failed: {:?}", e)))?;

    let device = enumerator
        .get_default_device(&Direction::Render)
        .map_err(|e| Error::from_reason(format!("Failed to get device: {:?}", e)))?;

    let mut audio_client = device
        .get_iaudioclient()
        .map_err(|e| Error::from_reason(format!("Failed to get audio client: {:?}", e)))?;

    let format = audio_client
        .get_mixformat()
        .map_err(|e| Error::from_reason(format!("Failed to get mix format: {:?}", e)))?;

    let sample_rate = format.get_samplespersec();
    let channels = format.get_nchannels();
    let block_align = format.get_blockalign() as usize;

    println!(
        "Loopback capture: {} Hz, {} channels, block_align: {}",
        sample_rate, channels, block_align
    );

    let (_def_period, min_period) = audio_client
        .get_device_period()
        .map_err(|e| Error::from_reason(format!("Failed to get device period: {:?}", e)))?;

    audio_client
        .initialize_client(
            &format,
            &Direction::Capture,
            &StreamMode::EventsShared {
                autoconvert: true,
                buffer_duration_hns: min_period,
            },
        )
        .map_err(|e| Error::from_reason(format!("Failed to initialize client: {:?}", e)))?;

    let h_event = audio_client
        .set_get_eventhandle()
        .map_err(|e| Error::from_reason(format!("Failed to set event handle: {:?}", e)))?;

    let buffer_size = audio_client
        .get_buffer_size()
        .map_err(|e| Error::from_reason(format!("Failed to get buffer size: {:?}", e)))?;

    let capture_client = audio_client
        .get_audiocaptureclient()
        .map_err(|e| Error::from_reason(format!("Failed to get capture client: {:?}", e)))?;

    audio_client
        .start_stream()
        .map_err(|e| Error::from_reason(format!("Failed to start stream: {:?}", e)))?;

    let mut resampler = SimpleResampler::new(sample_rate as usize, channels as usize);
    let mut sample_queue: VecDeque<u8> =
        VecDeque::with_capacity(block_align * (buffer_size as usize + 1024) * 4);

    while running.load(Ordering::SeqCst) {
        if h_event.wait_for_event(1000).is_err() {
            continue;
        }

        loop {
            match capture_client.get_next_packet_size() {
                Ok(Some(0)) | Ok(None) => break,
                Ok(Some(_)) => {}
                Err(e) => {
                    eprintln!("Packet size error: {:?}", e);
                    break;
                }
            }

            match capture_client.read_from_device_to_deque(&mut sample_queue) {
                Ok(_buffer_info) => {}
                Err(e) => {
                    eprintln!("Read error: {:?}", e);
                }
            }
        }

        if sample_queue.len() >= block_align * 256 {
            let bytes: Vec<u8> = sample_queue.drain(..block_align * 256).collect();
            let samples = bytes_to_f32(&bytes, channels as usize);
            if let Some(resampled) =
                resampler.process(samples, sample_rate as usize, channels as usize)
            {
                callback(resampled);
            }
        }
    }

    let _ = audio_client.stop_stream();
    Ok(())
}

fn bytes_to_f32(bytes: &[u8], channels: usize) -> Vec<f32> {
    let mut samples = Vec::with_capacity(bytes.len() / 4);
    for chunk in bytes.chunks_exact(4) {
        let sample = f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
        samples.push(sample);
    }
    samples
}

struct SimpleResampler {
    target_rate: usize,
    leftover: Vec<f32>,
}

impl SimpleResampler {
    fn new(source_rate: usize, _channels: usize) -> Self {
        let target_rate = 16000usize;
        SimpleResampler {
            target_rate,
            leftover: Vec::new(),
        }
    }

    fn process(
        &mut self,
        samples: Vec<f32>,
        source_rate: usize,
        channels: usize,
    ) -> Option<Vec<f32>> {
        if samples.is_empty() || channels == 0 {
            return None;
        }

        let is_stereo = channels >= 2;

        let mut mono: Vec<f32> = if is_stereo {
            samples
                .chunks(channels as usize)
                .map(|chunk| {
                    let left = chunk.get(0).copied().unwrap_or(0.0);
                    let right = chunk.get(1).copied().unwrap_or(0.0);
                    (left + right) / 2.0
                })
                .collect()
        } else {
            samples
        };

        self.leftover.append(&mut mono);

        if self.leftover.len() < 512 {
            return None;
        }

        let ratio = source_rate as f64 / self.target_rate as f64;
        let target_len = (self.leftover.len() as f64 / ratio) as usize;

        if target_len < 256 {
            return None;
        }

        let mut resampled = Vec::with_capacity(target_len);

        for i in 0..target_len {
            let src_idx = ((i as f64) * ratio) as usize;
            if src_idx < self.leftover.len() {
                resampled.push(self.leftover[src_idx]);
            }
        }

        let consumed = ((target_len as f64) * ratio) as usize;
        if consumed < self.leftover.len() {
            self.leftover = self.leftover.split_off(consumed);
        } else {
            self.leftover.clear();
        }

        if resampled.len() >= 128 {
            Some(resampled)
        } else {
            None
        }
    }
}

impl Drop for SystemAudioBackend {
    fn drop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}
