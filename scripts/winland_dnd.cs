using System;
using System.Runtime.InteropServices;

// WinLand Do Not Disturb helper.
//
// Windows 11 does NOT honor the legacy Windows 10 key
// HKCU\...\Notifications\Settings\NOC_GLOBAL_SETTING_TOASTS_ENABLED that the
// old implementation wrote. Real DND state lives in the undocumented
// QuietHoursSettings COM service (CLSID F53321FA-34F8-4B7F-B9A3-361877CB94CF),
// the same one YASB uses. This helper reads and writes the user-selected
// Quiet Hours profile through that service:
//   Unrestricted = DND off, PriorityOnly = DND on (Windows 11 toggle),
//   AlarmsOnly  = alarms only (DND on, stricter).
//
// The interface methods are called through the raw vtable (get = slot 3,
// put = slot 4) exactly like YASB's ctypes implementation, because the
// getter returns a plain CoTaskMem-allocated LPCWSTR rather than a BSTR —
// standard COM interop marshaling corrupts the heap on that mismatch.
//
// Usage:
//   winland_dnd.exe get        -> prints "disabled" | "priority" | "alarms"
//   winland_dnd.exe on         -> sets PriorityOnly (same as the OS toggle)
//   winland_dnd.exe off        -> sets Unrestricted
// Exit code 0 on success, non-zero on failure.

namespace WinLandDnd {
    class Program {
        const int CLSCTX_LOCAL_SERVER = 4;

        const string PROFILE_UNRESTRICTED = "Microsoft.QuietHoursProfile.Unrestricted";
        const string PROFILE_PRIORITY_ONLY = "Microsoft.QuietHoursProfile.PriorityOnly";
        const string PROFILE_ALARMS_ONLY   = "Microsoft.QuietHoursProfile.AlarmsOnly";

        [DllImport("ole32.dll")]
        static extern int CoCreateInstance(
            ref Guid rclsid, IntPtr pUnkOuter, uint dwClsContext,
            ref Guid riid, out IntPtr ppv);

        [DllImport("ole32.dll")]
        static extern void CoTaskMemFree(IntPtr pv);

        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        delegate int GetUserSelectedProfile(IntPtr self, out IntPtr profilePtr);

        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        delegate int PutUserSelectedProfile(IntPtr self, [MarshalAs(UnmanagedType.LPWStr)] string profile);

        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        delegate uint ReleaseFn(IntPtr self);

        static string Normalize(string profile) {
            if (profile == PROFILE_PRIORITY_ONLY) return "priority";
            if (profile == PROFILE_ALARMS_ONLY) return "alarms";
            return "disabled";
        }

        static int Main(string[] args) {
            string action = (args != null && args.Length > 0)
                ? args[0].Trim().ToLowerInvariant() : "get";
            try {
                Guid clsid = new Guid("F53321FA-34F8-4B7F-B9A3-361877CB94CF");
                Guid iid   = new Guid("6BFF4732-81EC-4FFB-AE67-B6C1BC29631F");
                IntPtr unk = IntPtr.Zero;
                int hr = CoCreateInstance(ref clsid, IntPtr.Zero,
                    CLSCTX_LOCAL_SERVER, ref iid, out unk);
                if (hr != 0 || unk == IntPtr.Zero) {
                    Console.Error.WriteLine("winland_dnd: CoCreateInstance failed 0x" + hr.ToString("X8"));
                    return 1;
                }

                try {
                    IntPtr vtable = Marshal.ReadIntPtr(unk);
                    IntPtr getFn = Marshal.ReadIntPtr(vtable, 3 * IntPtr.Size);
                    IntPtr putFn = Marshal.ReadIntPtr(vtable, 4 * IntPtr.Size);
                    IntPtr releaseFn = Marshal.ReadIntPtr(vtable, 2 * IntPtr.Size);

                    var get = (GetUserSelectedProfile)Marshal.GetDelegateForFunctionPointer(getFn, typeof(GetUserSelectedProfile));
                    var put = (PutUserSelectedProfile)Marshal.GetDelegateForFunctionPointer(putFn, typeof(PutUserSelectedProfile));

                    if (action == "on" || action == "off" || action == "alarms") {
                        string target = action == "off" ? PROFILE_UNRESTRICTED
                                      : action == "alarms" ? PROFILE_ALARMS_ONLY
                                      : PROFILE_PRIORITY_ONLY;
                        int setHr = put(unk, target);
                        if (setHr != 0) {
                            Console.Error.WriteLine("winland_dnd: put_UserSelectedProfile failed 0x" + setHr.ToString("X8"));
                            return 2;
                        }
                        Console.WriteLine(Normalize(target));
                    } else {
                        IntPtr profilePtr = IntPtr.Zero;
                        int getHr = get(unk, out profilePtr);
                        if (getHr != 0) {
                            Console.Error.WriteLine("winland_dnd: get_UserSelectedProfile failed 0x" + getHr.ToString("X8"));
                            return 2;
                        }
                        string profile = Marshal.PtrToStringUni(profilePtr);
                        if (profilePtr != IntPtr.Zero) CoTaskMemFree(profilePtr);
                        Console.WriteLine(Normalize(profile));
                    }
                } finally {
                    var release = (ReleaseFn)Marshal.GetDelegateForFunctionPointer(
                        Marshal.ReadIntPtr(Marshal.ReadIntPtr(unk), 2 * IntPtr.Size),
                        typeof(ReleaseFn));
                    release(unk);
                }
                return 0;
            } catch (Exception ex) {
                Console.Error.WriteLine("winland_dnd failed: " + ex.Message);
                return 1;
            }
        }
    }
}
