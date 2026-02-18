#![deny(clippy::all)]
#[macro_use]
extern crate napi_derive;

use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

pub mod audio_config;
pub mod microphone;
pub mod resampler;
pub mod silence_suppression;
pub mod speaker;
pub mod streaming_resampler;
pub mod system_audio;
pub mod vad;

use audio_config::{DSP_POLL_MS, FRAME_SAMPLES};
use silence_suppression::{
    generate_silence_frame, FrameAction, SilenceSuppressionConfig, SilenceSuppressor,
};
use streaming_resampler::StreamingResampler;

#[napi]
pub struct SystemAudioCapture {
    stop_signal: Arc<AtomicBool>,
    capture_thread: Option<thread::JoinHandle<()>>,
}

#[napi]
impl SystemAudioCapture {
    #[napi(constructor)]
    pub fn new(device_id: Option<String>) -> napi::Result<Self> {
        let _ = device_id;
        Ok(Self {
            stop_signal: Arc::new(AtomicBool::new(false)),
            capture_thread: None,
        })
    }

    #[napi]
    pub fn start(&mut self, callback: JsFunction) -> napi::Result<()> {
        let tsfn: ThreadsafeFunction<Vec<i16>, ErrorStrategy::Fatal> = callback
            .create_threadsafe_function(0, |ctx| {
                let vec: Vec<i16> = ctx.value;
                let mut pcm_bytes = Vec::with_capacity(vec.len() * 2);
                for sample in vec {
                    pcm_bytes.extend_from_slice(&sample.to_le_bytes());
                }
                Ok(vec![pcm_bytes])
            })?;

        self.stop_signal.store(false, Ordering::SeqCst);
        let stop_signal = self.stop_signal.clone();

        self.capture_thread = Some(thread::spawn(move || {
            if let Err(e) = run_capture_loop(stop_signal, tsfn) {
                eprintln!("Capture loop error: {:?}", e);
            }
        }));

        Ok(())
    }

    #[napi]
    pub fn stop(&mut self) {
        self.stop_signal.store(true, Ordering::SeqCst);
        if let Some(h) = self.capture_thread.take() {
            let _ = h.join();
        }
    }
}

fn run_capture_loop(
    stop_signal: Arc<AtomicBool>,
    tsfn: ThreadsafeFunction<Vec<i16>, ErrorStrategy::Fatal>,
) -> napi::Result<()> {
    let mut input = system_audio::SystemAudioStream::new(None)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let input_sample_rate = input.sample_rate() as f64;

    input
        .play()
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let mut resampler = StreamingResampler::new(input_sample_rate, 16000.0);
    let mut frame_buffer: Vec<i16> = Vec::with_capacity(FRAME_SAMPLES * 4);
    let mut suppressor = SilenceSuppressor::new(SilenceSuppressionConfig::default());

    while !stop_signal.load(Ordering::Relaxed) {
        let samples = input.poll_audio();

        if !samples.is_empty() {
            let resampled = resampler.resample(&samples);
            frame_buffer.extend(resampled);
        }

        while frame_buffer.len() >= FRAME_SAMPLES {
            let frame: Vec<i16> = frame_buffer.drain(0..FRAME_SAMPLES).collect();
            match suppressor.process(&frame) {
                FrameAction::Send(audio) => {
                    tsfn.call(audio, ThreadsafeFunctionCallMode::NonBlocking);
                }
                FrameAction::SendSilence => {
                    tsfn.call(
                        generate_silence_frame(FRAME_SAMPLES),
                        ThreadsafeFunctionCallMode::NonBlocking,
                    );
                }
                FrameAction::Suppress => {}
            }
        }

        if frame_buffer.len() < FRAME_SAMPLES {
            thread::sleep(Duration::from_millis(DSP_POLL_MS));
        }
    }

    let _ = input.stop();
    Ok(())
}

#[napi]
pub struct MicrophoneCapture {}

#[napi]
impl MicrophoneCapture {
    #[napi(constructor)]
    pub fn new() -> Self {
        MicrophoneCapture {}
    }

    #[napi]
    pub fn start(&mut self, _callback: JsFunction) -> Result<()> {
        Ok(())
    }

    #[napi]
    pub fn stop(&mut self) -> Result<()> {
        Ok(())
    }
}
