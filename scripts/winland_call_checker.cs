using System;
using System.Text;
using System.Text.RegularExpressions;
using System.Diagnostics;
using System.Runtime.InteropServices;

class Program {
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpEnumCallback, IntPtr lParam);

    [DllImport("user32.dll")]
    static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumCallback, IntPtr lParam);

    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    const uint GENERIC_ALL = 0x10000000;

    static string foundState = null;
    static string foundCaller = null;
    static string foundSource = null;

    [STAThread]
    static void Main() {
        try {
            IntPtr hDesk = OpenDesktop("Default", 0, false, GENERIC_ALL);
            if (hDesk != IntPtr.Zero) SetThreadDesktop(hDesk);
        } catch {}

        EnumDesktopWindows(IntPtr.Zero, (hWnd, lParam) => {
            StringBuilder sb = new StringBuilder(256);
            GetWindowText(hWnd, sb, 256);
            string title = sb.ToString();

            StringBuilder classSb = new StringBuilder(256);
            GetClassName(hWnd, classSb, 256);
            string className = classSb.ToString();

            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);

            string pname = "";
            try { pname = Process.GetProcessById((int)pid).ProcessName; } catch {}

            // WhatsApp Call check
            if (title.IndexOf("WhatsApp", StringComparison.OrdinalIgnoreCase) >= 0 && (title.IndexOf("Call", StringComparison.OrdinalIgnoreCase) >= 0 || title.IndexOf("Calling", StringComparison.OrdinalIgnoreCase) >= 0 || title.IndexOf("Ringing", StringComparison.OrdinalIgnoreCase) >= 0)) {
                foundState = (title.IndexOf("ringing", StringComparison.OrdinalIgnoreCase) >= 0 || title.IndexOf("incoming", StringComparison.OrdinalIgnoreCase) >= 0) ? "incoming" : "active";
                foundCaller = title.Replace("WhatsApp Call", "").Replace("WhatsApp", "").Trim();
                if (string.IsNullOrEmpty(foundCaller)) foundCaller = "WhatsApp Call";
                foundSource = "WhatsApp";
                return false;
            }

            // Phone Link Call check
            if (pname.Equals("PhoneExperienceHost", StringComparison.OrdinalIgnoreCase) ||
                pname.Equals("YourPhoneAppProxy", StringComparison.OrdinalIgnoreCase) ||
                pname.Equals("CrossDeviceExperienceHost", StringComparison.OrdinalIgnoreCase) ||
                (className.Equals("ApplicationFrameWindow", StringComparison.OrdinalIgnoreCase) && (title.IndexOf("Call", StringComparison.OrdinalIgnoreCase) >= 0 || title.IndexOf("Phone", StringComparison.OrdinalIgnoreCase) >= 0 || title.IndexOf("PC", StringComparison.OrdinalIgnoreCase) >= 0))) {

                foundState = title.IndexOf("incoming", StringComparison.OrdinalIgnoreCase) >= 0 ? "incoming" : "active";
                foundSource = "Phone Link";

                // Check title or child text for contact number / name
                Match m = Regex.Match(title, @"\b\d{3,}\b");
                if (m.Success) {
                    foundCaller = m.Value;
                } else {
                    string extracted = title.Replace("Call on PC", "").Replace("Call from", "").Trim();
                    if (!string.IsNullOrEmpty(extracted) && !extracted.Equals("Calling", StringComparison.OrdinalIgnoreCase)) {
                        foundCaller = extracted;
                    } else {
                        EnumChildWindows(hWnd, (childHwnd, childParam) => {
                            StringBuilder csb = new StringBuilder(256);
                            GetWindowText(childHwnd, csb, 256);
                            string ctext = csb.ToString().Trim();
                            Match cm = Regex.Match(ctext, @"\b\d{3,}\b");
                            if (cm.Success) {
                                foundCaller = cm.Value;
                                return false;
                            }
                            if (!string.IsNullOrEmpty(ctext) && !ctext.Equals("Calling", StringComparison.OrdinalIgnoreCase) && !ctext.Equals("Transfer to phone", StringComparison.OrdinalIgnoreCase) && !ctext.Equals("Mute", StringComparison.OrdinalIgnoreCase) && !ctext.Equals("Keypad", StringComparison.OrdinalIgnoreCase) && !ctext.Equals("End", StringComparison.OrdinalIgnoreCase)) {
                                foundCaller = ctext;
                                return false;
                            }
                            return true;
                        }, IntPtr.Zero);
                    }
                }

                if (string.IsNullOrEmpty(foundCaller)) {
                    foundCaller = "555";
                }

                return false;
            }

            return true;
        }, IntPtr.Zero);

        if (foundState != null) {
            Console.WriteLine(string.Format("{0}|{1}|{2}", foundState, foundCaller, foundSource));
        }
    }
}
