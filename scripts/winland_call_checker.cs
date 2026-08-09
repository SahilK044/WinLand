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
            string title = sb.ToString().Trim();

            StringBuilder classSb = new StringBuilder(256);
            GetClassName(hWnd, classSb, 256);
            string className = classSb.ToString().Trim();

            // Ignore system background windows completely
            if (string.IsNullOrEmpty(title) ||
                title.Equals("DDE Server Window", StringComparison.OrdinalIgnoreCase) ||
                title.StartsWith("GDI+", StringComparison.OrdinalIgnoreCase) ||
                title.Equals("Default IME", StringComparison.OrdinalIgnoreCase) ||
                title.Equals("MSCTFIME UI", StringComparison.OrdinalIgnoreCase) ||
                title.Equals("SystemResourceNotifyWindow", StringComparison.OrdinalIgnoreCase) ||
                title.Equals("MediaContextNotificationWindow", StringComparison.OrdinalIgnoreCase) ||
                title.Equals("CallBackWindowThread", StringComparison.OrdinalIgnoreCase) ||
                title.Equals("CiceroUIWndFrame", StringComparison.OrdinalIgnoreCase) ||
                title.Equals("DesktopWindowXamlSource", StringComparison.OrdinalIgnoreCase)) {
                return true;
            }

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

            // Phone Link Call check — only for visible application frame / call windows
            if (IsWindowVisible(hWnd) && (className.Equals("ApplicationFrameWindow", StringComparison.OrdinalIgnoreCase) || className.Contains("Windows.UI") || pname.Equals("PhoneExperienceHost", StringComparison.OrdinalIgnoreCase) || pname.Equals("YourPhoneAppProxy", StringComparison.OrdinalIgnoreCase))) {
                if (title.IndexOf("Call", StringComparison.OrdinalIgnoreCase) >= 0 || title.IndexOf("Phone", StringComparison.OrdinalIgnoreCase) >= 0 || title.IndexOf("Calling", StringComparison.OrdinalIgnoreCase) >= 0 || title.IndexOf("Incoming", StringComparison.OrdinalIgnoreCase) >= 0) {
                    foundState = (title.IndexOf("incoming", StringComparison.OrdinalIgnoreCase) >= 0 || title.IndexOf("ringing", StringComparison.OrdinalIgnoreCase) >= 0) ? "incoming" : "active";
                    foundSource = "Phone Link";

                    // Extract caller contact name/number if present in title
                    Match m = Regex.Match(title, @"\b\d{3,}\b");
                    if (m.Success) {
                        foundCaller = m.Value;
                    } else {
                        string extracted = title.Replace("Call on PC", "").Replace("Call from", "").Trim();
                        if (!string.IsNullOrEmpty(extracted) && !extracted.Equals("Calling", StringComparison.OrdinalIgnoreCase)) {
                            foundCaller = extracted;
                        }
                    }

                    if (string.IsNullOrEmpty(foundCaller)) {
                        foundCaller = "Phone Call";
                    }

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
