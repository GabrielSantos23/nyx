import { useEffect, useState } from "react";

export function useAutoLaunch() {
  const [enabled, setEnabled] = useState(false);
  const [openAsHidden, setOpenAsHidden] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAutoLaunchStatus();
  }, []);

  const loadAutoLaunchStatus = async () => {
    try {
      const status = await window.electronAPI.getAutoLaunch();
      setEnabled(status.enabled);
      setOpenAsHidden(status.openAsHidden);
    } catch (error) {
      console.error("Failed to load auto-launch status:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoLaunch = async (shouldEnable: boolean, hidden = false) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.setAutoLaunch(
        shouldEnable,
        hidden,
      );
      if (result.success) {
        setEnabled(shouldEnable);
        setOpenAsHidden(hidden);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to toggle auto-launch:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    enabled,
    openAsHidden,
    loading,
    toggleAutoLaunch,
    refresh: loadAutoLaunchStatus,
  };
}
