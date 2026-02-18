#[cfg(target_os = "windows")]
pub mod windows;
#[cfg(target_os = "windows")]
pub use windows::SystemAudioBackend as Backend;

#[cfg(target_os = "macos")]
pub mod sck;
#[cfg(target_os = "macos")]
pub use sck::SystemAudioBackend as Backend;

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub struct Backend {}
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
impl Backend {
    pub fn new(_: Option<String>) -> Self {
        Backend {}
    }
    pub fn start(&mut self, _: impl Fn(Vec<f32>) + Send + 'static) -> napi::Result<()> {
        Ok(())
    }
    pub fn stop(&mut self) -> napi::Result<()> {
        Ok(())
    }
}
