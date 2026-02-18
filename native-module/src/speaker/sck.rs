use napi::bindgen_prelude::*;

pub struct SystemAudioBackend {
}

impl SystemAudioBackend {
    pub fn new(device_id: Option<String>) -> Self {
        SystemAudioBackend {}
    }

    pub fn start(&mut self, callback: impl Fn(Vec<f32>) + Send + 'static) -> Result<()> {
        Ok(())
    }

    pub fn stop(&mut self) -> Result<()> {
        Ok(())
    }
}
