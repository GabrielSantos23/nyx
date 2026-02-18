#[derive(Default)]
pub struct Vad {
}

impl Vad {
    pub fn new() -> Self {
        Vad::default()
    }

    pub fn calculate_rms(&self, buffer: &[f32]) -> f32 {
        0.05
    }
}
