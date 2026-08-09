using System;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices;

class Program {
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr OpenWindowStation(string lpszWinSta, bool fInherit, uint dwDesiredAccess);

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
        // Attach to user interactive desktop if running in background worker
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

            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);

            Process proc = null;
            try { proc = Process.GetProcessById((int)pid); } catch {}
            string pname = proc != null ? proc.ProcessName : "";

            if (!string.IsNullOrEmpty(title) || pname.Equals("PhoneExperienceHost", StringComparison.OrdinalIgnoreCase)) {
                string lower = title.ToLower();
                // Phone Link Call detection (Call on PC, Calling, Call from, Phone Link, PhoneExperienceHost)
                if (title.Contains("Call on PC") || title.Contains("Call from") || lower.Contains("calling") || lower.Contains("incoming call") || (pname.Equals("PhoneExperienceHost", StringComparison.OrdinalIgnoreCase) && (title.Contains("Call") || title.Contains("555") || title.Contains("Phone") || title.Length > 0))) {
                    foundState = (lower.Contains("incoming") || lower.Contains("ringing")) ? "incoming" : "active";
                    foundCaller = title.Replace("Call on PC", "").Replace("Call from", "").Trim();
                    if (string.IsNullOrEmpty(foundCaller)) foundCaller = "Phone Link Call";
                    foundSource = "Phone Link";
                    return false; // Stop search
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

            return true;
        }, IntPtr.Zero);

        // Fallback: Check process list for PhoneExperienceHost or WhatsApp Call
        if (foundState == null) {
            try {
                Process[] pList = Process.GetProcessesByName("PhoneExperienceHost");
                if (pList.Length > 0) {
                    foundState = "active";
                    foundCaller = "Phone Link Call";
                    foundSource = "Phone Link";
                }
            } catch {}
        }

        if (foundState != null) {
            Console.WriteLine(string.Format("{0}|{1}|{2}", foundState, foundCaller, foundSource));
        }
    }
}
