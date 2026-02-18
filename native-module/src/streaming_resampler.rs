pub struct StreamingResampler {
    ratio: f64,
    fractional_pos: f64,
    prev_sample: f32,
    initialized: bool,
}

impl StreamingResampler {
    pub fn new(input_sample_rate: f64, output_sample_rate: f64) -> Self {
        let ratio = input_sample_rate / output_sample_rate;
        Self {
            ratio,
            fractional_pos: 0.0,
            prev_sample: 0.0,
            initialized: false,
        }
    }

    pub fn resample(&mut self, input: &[f32]) -> Vec<i16> {
        if input.is_empty() {
            return Vec::new();
        }

        let estimated_output = ((input.len() as f64 / self.ratio) + 2.0) as usize;
        let mut output = Vec::with_capacity(estimated_output);

        if !self.initialized {
            self.prev_sample = input[0];
            self.initialized = true;
        }

        while self.fractional_pos < input.len() as f64 {
            let pos = self.fractional_pos;
            let idx = pos.floor() as usize;
            let frac = pos - idx as f64;

            let sample_a = if idx == 0 && frac < 0.001 {
                self.prev_sample
            } else if idx < input.len() {
                input[idx]
            } else {
                break;
            };

            let sample_b = if idx + 1 < input.len() {
                input[idx + 1]
            } else if idx < input.len() {
                input[idx]
            } else {
                break;
            };

            let interpolated = sample_a + (frac as f32) * (sample_b - sample_a);
            let scaled = (interpolated * 32767.0).clamp(-32768.0, 32767.0);
            output.push(scaled as i16);

            self.fractional_pos += self.ratio;
        }

        self.fractional_pos -= input.len() as f64;

        if let Some(&last) = input.last() {
            self.prev_sample = last;
        }

        output
    }
}
