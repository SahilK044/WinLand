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

            if (!string.IsNullOrEmpty(title)) {
                string lower = title.ToLower();
                // Phone Link Call detection
                if (title.Contains("Call on PC") || title.Contains("Call from") || lower.Contains("calling") || lower.Contains("incoming call") || (title.Contains("Phone") && (lower.Contains("call") || lower.Contains("calling")))) {
                    foundState = (lower.Contains("incoming") || lower.Contains("ringing")) ? "incoming" : "active";

                    // Try to extract exact contact name/number from title or child windows
                    string extracted = title.Replace("Call on PC", "").Replace("Call from", "").Trim();
                    if (!string.IsNullOrEmpty(extracted) && !extracted.Equals("Calling", StringComparison.OrdinalIgnoreCase)) {
                        foundCaller = extracted;
                    } else {
                        // Check child windows for contact name / number
                        EnumChildWindows(hWnd, (childHwnd, childParam) => {
                            StringBuilder csb = new StringBuilder(256);
                            GetWindowText(childHwnd, csb, 256);
                            string ctext = csb.ToString().Trim();
                            if (!string.IsNullOrEmpty(ctext) && !ctext.Equals("Calling", StringComparison.OrdinalIgnoreCase) && !ctext.Equals("Transfer to phone", StringComparison.OrdinalIgnoreCase) && !ctext.Equals("Mute", StringComparison.OrdinalIgnoreCase) && !ctext.Equals("Keypad", StringComparison.OrdinalIgnoreCase) && !ctext.Equals("End", StringComparison.OrdinalIgnoreCase)) {
                                foundCaller = ctext;
                                return false;
                            }
                            return true;
                        }, IntPtr.Zero);
                    }

                    if (string.IsNullOrEmpty(foundCaller)) {
                        foundCaller = "555"; // Default contact number if title is plain "Call on PC"
                    }

                    foundSource = "Phone Link";
                    return false;
                }

                // WhatsApp call detection
                if (title.Contains("WhatsApp") && (title.Contains("Call") || lower.Contains("calling") || lower.Contains("ringing"))) {
                    foundState = (lower.Contains("ringing") || lower.Contains("incoming")) ? "incoming" : "active";
                    foundCaller = title.Replace("WhatsApp Call", "").Replace("WhatsApp", "").Trim();
                    if (string.IsNullOrEmpty(foundCaller)) foundCaller = "WhatsApp Call";
                    foundSource = "WhatsApp";
                    return false;
                }
            }

            // Also check ApplicationFrameWindow or Phone processes with active visible frames
            if (IsWindowVisible(hWnd) && (pname.Equals("PhoneExperienceHost", StringComparison.OrdinalIgnoreCase) || pname.Equals("YourPhoneAppProxy", StringComparison.OrdinalIgnoreCase) || pname.Equals("CrossDeviceExperienceHost", StringComparison.OrdinalIgnoreCase))) {
                if (!string.IsNullOrEmpty(title) && !title.Equals("Default IME") && !title.Equals("MSCTFIME UI")) {
                    foundState = title.ToLower().Contains("incoming") ? "incoming" : "active";
                    foundCaller = title.Replace("Call on PC", "").Trim();
                    if (string.IsNullOrEmpty(foundCaller)) foundCaller = "555";
                    foundSource = "Phone Link";
                    return false;
                }
            }

            return true;
        }, IntPtr.Zero);

        if (foundState != null) {
            Console.WriteLine(string.Format("{0}|{1}|{2}", foundState, foundCaller, foundSource));
        }
    }
}
