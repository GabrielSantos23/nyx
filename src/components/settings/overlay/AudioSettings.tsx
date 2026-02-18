import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Speaker,
  Info,
  FlaskConical,
  Upload,
  Trash2,
  Cloud,
  Globe,
} from "lucide-react";
import { CustomSelect } from "./CustomSelect";

export const AudioSettings: React.FC = () => {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState("");
  const [selectedOutput, setSelectedOutput] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [useLegacyAudio, setUseLegacyAudio] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [sttProvider, setSTTProvider] = useState<"web" | "google">("web");
  const [hasGoogleCreds, setHasGoogleCreds] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const languageOptions: MediaDeviceInfo[] = [
    {
      deviceId: "en-US",
      label: "English (US)",
      kind: "audioinput" as MediaDeviceKind,
      groupId: "",
      toJSON: () => ({}),
    },
    {
      deviceId: "pt-BR",
      label: "Português (BR)",
      kind: "audioinput" as MediaDeviceKind,
      groupId: "",
      toJSON: () => ({}),
    },
  ];

  const sttProviderOptions: MediaDeviceInfo[] = [
    {
      deviceId: "web",
      label: "Microphone (Browser)",
      kind: "audioinput" as MediaDeviceKind,
      groupId: "",
      toJSON: () => ({}),
    },
    {
      deviceId: "google",
      label: "System Audio (Native)",
      kind: "audioinput" as MediaDeviceKind,
      groupId: "",
      toJSON: () => ({}),
    },
  ];

  useEffect(() => {
    const loadLanguage = async () => {
      if (window.electronAPI?.getLanguage) {
        const lang = await window.electronAPI.getLanguage();
        setSelectedLanguage(lang);
      }
    };
    loadLanguage();
  }, []);

  useEffect(() => {
    const loadSTTSettings = async () => {
      if (window.electronAPI?.getSTTProvider) {
        const provider = await window.electronAPI.getSTTProvider();
        setSTTProvider(provider);
      }
      if (window.electronAPI?.hasGoogleCredentials) {
        const has = await window.electronAPI.hasGoogleCredentials();
        setHasGoogleCreds(has);
      }
    };
    loadSTTSettings();
  }, []);

  const handleLanguageChange = async (lang: string) => {
    setSelectedLanguage(lang);
    if (window.electronAPI?.setLanguage) {
      await window.electronAPI.setLanguage(lang as "en-US" | "pt-BR");
    }
  };

  const handleSTTProviderChange = async (provider: string) => {
    const p = provider as "web" | "google";
    setSTTProvider(p);
    if (window.electronAPI?.setSTTProvider) {
      await window.electronAPI.setSTTProvider(p);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      JSON.parse(text);

      if (window.electronAPI?.saveGoogleCredentials) {
        const result = await window.electronAPI.saveGoogleCredentials(text);
        if (result.success) {
          setHasGoogleCreds(true);
          setUploadStatus("Saved! Please restart the app.");
          setTimeout(() => setUploadStatus(""), 5000);
        } else {
          setUploadStatus(`Error: ${result.error}`);
        }
      }
    } catch (err) {
      setUploadStatus(
        "Invalid JSON file. Please select a valid service account key.",
      );
      setTimeout(() => setUploadStatus(""), 4000);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveCredentials = async () => {
    if (window.electronAPI?.removeGoogleCredentials) {
      const result = await window.electronAPI.removeGoogleCredentials();
      if (result.success) {
        setHasGoogleCreds(false);
        setUploadStatus("Removed! Please restart the app.");
        if (sttProvider === "google") {
          handleSTTProviderChange("web");
        }
        setTimeout(() => setUploadStatus(""), 3000);
      }
    }
  };

  useEffect(() => {
    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const devices = await navigator.mediaDevices.enumerateDevices();

        const inputs = devices.filter((d) => d.kind === "audioinput");
        const outputs = devices.filter((d) => d.kind === "audiooutput");

        setInputDevices(inputs);
        setOutputDevices(outputs);

        const savedInput = localStorage.getItem("preferredInputDeviceId");
        const savedOutput = localStorage.getItem("preferredOutputDeviceId");

        if (savedInput && inputs.find((d) => d.deviceId === savedInput)) {
          setSelectedInput(savedInput);
        } else if (inputs.length > 0 && !selectedInput) {
          setSelectedInput(inputs[0].deviceId);
        }

        if (savedOutput && outputs.find((d) => d.deviceId === savedOutput)) {
          setSelectedOutput(savedOutput);
        } else if (outputs.length > 0 && !selectedOutput) {
          setSelectedOutput(outputs[0].deviceId);
        }
      } catch (e) {
        console.error("Error loading devices:", e);
      }
    };
    loadDevices();

    const savedLegacy =
      localStorage.getItem("useLegacyAudioBackend") === "true";
    setUseLegacyAudio(savedLegacy);
  }, [selectedInput, selectedOutput]);

  useEffect(() => {
    let mounted = true;

    const startAudio = async () => {
      try {
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedInput ? { exact: selectedInput } : undefined,
          },
        });

        streamRef.current = stream;

        if (!mounted) return;

        const audioContext = new (
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext: typeof AudioContext;
            }
          ).webkitAudioContext
        )();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let smoothLevel = 0;

        const updateLevel = () => {
          if (!mounted || !analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const value = (dataArray[i] - 128) / 128;
            sum += value * value;
          }

          const rms = Math.sqrt(sum / dataArray.length);
          const db = 20 * Math.log10(rms);
          const targetLevel = Math.max(0, Math.min(100, (db + 60) * 2));

          if (targetLevel > smoothLevel) {
            smoothLevel = smoothLevel * 0.7 + targetLevel * 0.3;
          } else {
            smoothLevel = smoothLevel * 0.95 + targetLevel * 0.05;
          }

          setMicLevel(smoothLevel);

          rafRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
      } catch (error) {
        console.error("Error accessing microphone:", error);
        setMicLevel(0);
      }
    };

    startAudio();

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setMicLevel(0);
    };
  }, [selectedInput]);

  return (
    <div className="space-y-6 animated fadeIn">
      <div>
        <h3 className="text-lg font-bold text-text-primary mb-2">
          Audio Configuration
        </h3>
        <p className="text-xs text-text-secondary mb-6">
          Manage input and output devices.
        </p>

        <div className="space-y-6">
          <div>
            <CustomSelect
              label="Language"
              icon={null}
              value={selectedLanguage}
              options={languageOptions}
              onChange={handleLanguageChange}
              placeholder="Select Language"
            />

            <div className="flex gap-2 items-center mt-2 px-1">
              <Info size={14} className="text-text-secondary shrink-0" />
              <p className="text-xs text-text-secondary whitespace-nowrap">
                Select the language for voice recognition.
              </p>
            </div>
          </div>

          <div className="h-px bg-border-subtle" />

          {/* Speech Provider Section */}
          <div>
            <CustomSelect
              label="Speech Provider"
              icon={<Globe size={16} />}
              value={sttProvider}
              options={sttProviderOptions}
              onChange={handleSTTProviderChange}
              placeholder="Select Speech Provider"
            />

            <div className="flex gap-2 items-center mt-2 px-1">
              <Info size={14} className="text-text-secondary shrink-0" />
              <p className="text-xs text-text-secondary">
                {sttProvider === "web"
                  ? "Captures audio from your microphone. Requires Google Cloud credentials."
                  : "Captures system/desktop audio using native module. Requires Google Cloud credentials."}
              </p>
            </div>
          </div>

          {/* Google Cloud Credentials Section */}
          <div className="space-y-3 p-3 bg-bg-elevated rounded-lg border border-border-subtle">
            <div className="flex items-center gap-2">
              <Cloud size={16} className="text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">
                Google Cloud Credentials
              </span>
            </div>

            {hasGoogleCreds ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-text-secondary">
                    Credentials configured
                  </span>
                </div>
                <button
                  onClick={handleRemoveCredentials}
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-text-secondary">
                  Upload your Google Cloud service account JSON key file.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs bg-bg-input hover:bg-bg-elevated text-text-primary px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 border border-border-subtle"
                >
                  <Upload size={12} />
                  Upload Service Account Key
                </button>
              </div>
            )}

            {uploadStatus && (
              <p
                className={`text-xs ${
                  uploadStatus.startsWith("Error") ||
                  uploadStatus.startsWith("Invalid")
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                {uploadStatus}
              </p>
            )}
          </div>

          <div className="h-px bg-border-subtle" />

          <div className="space-y-4">
            <CustomSelect
              label="Input Device"
              icon={<Mic size={16} />}
              value={selectedInput}
              options={inputDevices}
              onChange={(id) => {
                setSelectedInput(id);
                localStorage.setItem("preferredInputDeviceId", id);
              }}
              placeholder="Default Microphone"
            />

            <div>
              <div className="flex justify-between text-xs text-text-secondary mb-2 px-1">
                <span>Input Level</span>
              </div>
              <div className="h-1.5 bg-bg-input rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-100 ease-out"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>

            <div className="h-px bg-border-subtle my-4" />

            <CustomSelect
              label="Output Device"
              icon={<Speaker size={16} />}
              value={selectedOutput}
              options={outputDevices}
              onChange={(id) => {
                setSelectedOutput(id);
                localStorage.setItem("preferredOutputDeviceId", id);
              }}
              placeholder="Default Speakers"
            />

            <div className="flex justify-end">
              <button
                onClick={() => {
                  const audio = new Audio(
                    "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
                  );
                  // @ts-ignore
                  if (selectedOutput && audio.setSinkId) {
                    // @ts-ignore
                    audio
                      .setSinkId(selectedOutput)
                      .catch((e: unknown) =>
                        console.error("Error setting sink", e),
                      );
                  }
                  audio
                    .play()
                    .catch((e) => console.error("Error playing test sound", e));
                }}
                className="text-xs bg-bg-input hover:bg-bg-elevated text-text-primary px-3 py-1.5 rounded-md transition-colors flex items-center gap-2"
              >
                <Speaker size={12} /> Test Sound
              </button>
            </div>

            <div className="h-px bg-border-subtle my-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
