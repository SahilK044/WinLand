using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int RegisterControlChangeNotify(IntPtr pNotify);
    int UnregisterControlChangeNotify(IntPtr pNotify);
    int GetChannelCount(out uint pnChannelCount);
    int SetMasterVolumeLevel(float fLevelDB, Guid pguidEventContext);
    int SetMasterVolumeLevelScalar(float fLevelScalar, Guid pguidEventContext);
    int GetMasterVolumeLevel(out float pfLevelDB);
    int GetMasterVolumeLevelScalar(out float pfLevelScalar);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref Guid iid, uint dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int EnumAudioEndpoints(int dataFlow, int dwStateMask, out object ppDevices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

class VolumeHelper {
    [DllImport("ole32.dll")]
    static extern int CoInitializeEx(IntPtr pvReserved, uint dwCoInit);

    [DllImport("ole32.dll")]
    static extern int CoCreateInstance(ref Guid rclsid, IntPtr pUnkOuter, uint dwClsContext, ref Guid riid, out IntPtr ppv);

    static IMMDeviceEnumerator GetEnumerator() {
        Guid IID_IMMDeviceEnumerator = new Guid("A95664D2-9614-4F35-A746-DE8DB63617E6");

        // Primary Windows 11 CLSID
        Guid CLSID1 = new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E");
        IntPtr pEnum;
        int hr = CoCreateInstance(ref CLSID1, IntPtr.Zero, 1 /* CLSCTX_INPROC_SERVER */, ref IID_IMMDeviceEnumerator, out pEnum);
        if (hr == 0 && pEnum != IntPtr.Zero) {
            return (IMMDeviceEnumerator)Marshal.GetObjectForIUnknown(pEnum);
        }

        // Legacy Windows 10 CLSID
        Guid CLSID2 = new Guid("BCDE0385-4D65-4F76-9C2C-4540B3F33549");
        hr = CoCreateInstance(ref CLSID2, IntPtr.Zero, 1, ref IID_IMMDeviceEnumerator, out pEnum);
        if (hr == 0 && pEnum != IntPtr.Zero) {
            return (IMMDeviceEnumerator)Marshal.GetObjectForIUnknown(pEnum);
        }

        throw new COMException("MMDeviceEnumerator CoCreateInstance failed", hr);
    }

    static IAudioEndpointVolume GetMasterVolumeEndpoint() {
        var enumerator = GetEnumerator();
        IMMDevice dev;
        int hr = enumerator.GetDefaultAudioEndpoint(0 /* eRender */, 1 /* eMultimedia */, out dev);
        if (hr != 0 || dev == null) throw new COMException("GetDefaultAudioEndpoint failed", hr);

        Guid IID_IAudioEndpointVolume = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
        object volObj;
        hr = dev.Activate(ref IID_IAudioEndpointVolume, 1, IntPtr.Zero, out volObj);
        if (hr != 0 || volObj == null) throw new COMException("Activate IAudioEndpointVolume failed", hr);

        return (IAudioEndpointVolume)volObj;
    }

    [STAThread]
    static int Main(string[] args) {
        try {
            CoInitializeEx(IntPtr.Zero, 0); // COINIT_APARTMENTTHREADED

            if (args.Length == 0 || args[0] == "get") {
                var endpoint = GetMasterVolumeEndpoint();
                float vol;
                endpoint.GetMasterVolumeLevelScalar(out vol);
                Console.WriteLine((int)Math.Round(vol * 100.0));
                return 0;
            }
            else if (args[0] == "set" && args.Length >= 2) {
                int pct;
                if (!int.TryParse(args[1], out pct)) { Console.WriteLine("-1"); return 1; }
                if (pct < 0) pct = 0;
                if (pct > 100) pct = 100;

                var endpoint = GetMasterVolumeEndpoint();
                endpoint.SetMasterVolumeLevelScalar(pct / 100f, Guid.Empty);

                float vol;
                endpoint.GetMasterVolumeLevelScalar(out vol);
                Console.WriteLine((int)Math.Round(vol * 100.0));
                return 0;
            }
            else {
                Console.Error.WriteLine("Usage: volume_helper [get|set <0-100>]");
                return 1;
            }
        }
        catch (Exception ex) {
            Console.Error.WriteLine("ERR: " + ex.Message);
            Console.WriteLine("-1");
            return 1;
        }
    }
}
