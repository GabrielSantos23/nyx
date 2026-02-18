use napi::bindgen_prelude::*;
use napi::Env;
use napi_derive::napi;

#[napi]
pub struct MicrophoneCapture {}

#[napi]
impl MicrophoneCapture {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {}
    }

    #[napi]
    pub fn start(&mut self, callback: JsFunction) -> Result<()> {
        Ok(())
    }

    #[napi]
    pub fn stop(&mut self) {
    }
}
