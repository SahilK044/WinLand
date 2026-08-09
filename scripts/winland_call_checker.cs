using System;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices;

class Program {
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpEnumCallback, IntPtr lParam);
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
            if (hDesk != IntPtr.Zero) {
                SetThreadDesktop(hDesk);
            }
        } catch {}

        EnumDesktopWindows(IntPtr.Zero, (hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;

            StringBuilder sb = new StringBuilder(256);
            GetWindowText(hWnd, sb, 256);
            string title = sb.ToString();

            StringBuilder classSb = new StringBuilder(256);
            GetClassName(hWnd, classSb, 256);
            string className = classSb.ToString();

            if (string.IsNullOrEmpty(title)) return true;

            string lower = title.ToLower();

            // Explicit Phone Link Call window detection ("Call on PC", "Call from", "Incoming call")
            if (className == "ApplicationFrameWindow" || className.Contains("Windows.UI") || className.Contains("Chrome")) {
                if (title.Contains("Call on PC") || title.Contains("Call from") || lower.Contains("incoming call") || (title.Contains("Phone Link") && lower.Contains("call"))) {
                    foundState = (lower.Contains("incoming") || lower.Contains("ringing")) ? "incoming" : "active";
                    foundCaller = title.Replace("Call on PC", "").Replace("Call from", "").Trim();
                    if (string.IsNullOrEmpty(foundCaller)) foundCaller = "Phone Link Call";
                    foundSource = "Phone Link";
                    return false; // Stop search
                }
            }

            // WhatsApp call window detection
            if (title.Contains("WhatsApp") && (title.Contains("Call") || lower.Contains("calling") || lower.Contains("ringing"))) {
                foundState = (lower.Contains("ringing") || lower.Contains("incoming")) ? "incoming" : "active";
                foundCaller = title.Replace("WhatsApp Call", "").Replace("WhatsApp", "").Trim();
                if (string.IsNullOrEmpty(foundCaller)) foundCaller = "WhatsApp Call";
                foundSource = "WhatsApp";
                return false;
            }

            return true;
        }, IntPtr.Zero);

        if (foundState != null) {
            Console.WriteLine(string.Format("{0}|{1}|{2}", foundState, foundCaller, foundSource));
        }
    }
}
