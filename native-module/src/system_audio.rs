use anyhow::Result;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use wasapi::*;

pub struct SystemAudioStream {
    audio_client: Option<AudioClient>,
    capture_client: Option<AudioCaptureClient>,
    event_handle: Option<Handle>,
    sample_rate: u32,
    channels: u32,
    is_running: Arc<AtomicBool>,
}

unsafe impl Send for SystemAudioStream {}

impl SystemAudioStream {
    pub fn new(_device_id: Option<String>) -> Result<Self> {
        let _ = initialize_mta();

        let enumerator = DeviceEnumerator::new()?;
        let device = enumerator.get_default_device(&Direction::Render)?;
        let mut audio_client = device.get_iaudioclient()?;

        let format = audio_client.get_mixformat()?;
        let sample_rate = format.get_samplespersec();
        let channels = format.get_nchannels() as u32;

        let (_def_period, min_period) = audio_client.get_device_period()?;

        audio_client.initialize_client(
            &format,
            &Direction::Capture,
            &StreamMode::EventsShared {
                autoconvert: true,
                buffer_duration_hns: min_period,
            },
        )?;

        let h_event = audio_client.set_get_eventhandle()?;
        let capture_client = audio_client.get_audiocaptureclient()?;

        Ok(Self {
            audio_client: Some(audio_client),
            capture_client: Some(capture_client),
            event_handle: Some(h_event),
            sample_rate,
            channels,
            is_running: Arc::new(AtomicBool::new(false)),
        })
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    pub fn channels(&self) -> u32 {
        self.channels
    }

    pub fn play(&mut self) -> Result<()> {
        if let Some(ref client) = self.audio_client {
            client.start_stream()?;
            self.is_running.store(true, Ordering::SeqCst);
        }
        Ok(())
    }

    pub fn stop(&mut self) -> Result<()> {
        if let Some(ref client) = self.audio_client {
            client.stop_stream()?;
        }
        self.is_running.store(false, Ordering::SeqCst);
        Ok(())
    }

    pub fn poll_audio(&mut self) -> Vec<f32> {
        let capture = match self.capture_client.as_ref() {
            Some(c) => c,
            None => return Vec::new(),
        };

        let event = match self.event_handle.as_ref() {
            Some(e) => e,
            None => return Vec::new(),
        };

        if event.wait_for_event(100).is_err() {
            return Vec::new();
        }

        let channels = self.channels as usize;
        let mut samples_out = Vec::new();

        loop {
            match capture.get_next_packet_size() {
                Ok(Some(0)) | Ok(None) => break,
                Ok(Some(_)) => {}
                Err(_) => break,
            }

            let mut data_queue: std::collections::VecDeque<u8> = std::collections::VecDeque::new();
            match capture.read_from_device_to_deque(&mut data_queue) {
                Ok(_) => {
                    let bytes: Vec<u8> = data_queue.into_iter().collect();
                    let samples = bytes_to_f32(&bytes);

                    if channels > 1 {
                        for chunk in samples.chunks(channels) {
                            let mono = chunk.iter().sum::<f32>() / channels as f32;
                            samples_out.push(mono);
                        }
                    } else {
                        samples_out.extend(samples);
                    }
                }
                Err(_) => {}
            }
        }

        samples_out
    }
}

fn bytes_to_f32(bytes: &[u8]) -> Vec<f32> {
    let mut samples = Vec::with_capacity(bytes.len() / 4);
    for chunk in bytes.chunks_exact(4) {
        let sample = f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
        samples.push(sample);
    }
    samples
}

impl Drop for SystemAudioStream {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}
