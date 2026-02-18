use std::time::{Duration, Instant};

pub struct SilenceSuppressionConfig {
    pub speech_threshold_rms: f32,
    pub speech_hangover: Duration,
    pub silence_keepalive_interval: Duration,
}

impl Default for SilenceSuppressionConfig {
    fn default() -> Self {
        Self {
            speech_threshold_rms: 100.0,
            speech_hangover: Duration::from_millis(200),
            silence_keepalive_interval: Duration::from_millis(100),
        }
    }
}

pub struct SilenceSuppressor {
    config: SilenceSuppressionConfig,
    state: SuppressionState,
    last_speech_time: Instant,
    last_keepalive_time: Instant,
}

#[derive(Clone, Copy)]
enum SuppressionState {
    Active,
    Hangover,
    Suppressed,
}

pub enum FrameAction {
    Send(Vec<i16>),
    SendSilence,
    Suppress,
}

impl SilenceSuppressor {
    pub fn new(config: SilenceSuppressionConfig) -> Self {
        let now = Instant::now();
        Self {
            config,
            state: SuppressionState::Active,
            last_speech_time: now,
            last_keepalive_time: now,
        }
    }

    pub fn process(&mut self, frame: &[i16]) -> FrameAction {
        let now = Instant::now();
        let rms = calculate_rms(frame);

        if rms >= self.config.speech_threshold_rms {
            self.state = SuppressionState::Active;
            self.last_speech_time = now;
            return FrameAction::Send(frame.to_vec());
        }

        match self.state {
            SuppressionState::Active | SuppressionState::Hangover => {
                if now.duration_since(self.last_speech_time) > self.config.speech_hangover {
                    self.state = SuppressionState::Suppressed;
                } else {
                    self.state = SuppressionState::Hangover;
                    return FrameAction::Send(frame.to_vec());
                }
            }
            SuppressionState::Suppressed => {}
        }

        if now.duration_since(self.last_keepalive_time) >= self.config.silence_keepalive_interval {
            self.last_keepalive_time = now;
            FrameAction::SendSilence
        } else {
            FrameAction::Suppress
        }
    }
}

fn calculate_rms(samples: &[i16]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum: f64 = samples
        .iter()
        .step_by(4)
        .map(|&s| (s as f64) * (s as f64))
        .sum();
    (sum / ((samples.len() + 3) / 4) as f64).sqrt() as f32
}

pub fn generate_silence_frame(size: usize) -> Vec<i16> {
    vec![0i16; size]
}
