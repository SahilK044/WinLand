using System;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Automation;

class Program {
    [DllImport("user32.dll")]
    static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    static string foundState = null;
    static string foundCaller = null;
    static string foundSource = null;

    [STAThread]
    static void Main() {
        EnumWindows((hWnd, lParam) => {
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

            if (!string.IsNullOrEmpty(title)) {
                string lower = title.ToLower();
                // Phone Link Call detection
                if (title.Contains("Call on PC") || title.Contains("Call from") || lower.Contains("calling") || lower.Contains("incoming call") || (pname.Equals("PhoneExperienceHost", StringComparison.OrdinalIgnoreCase) && (title.Contains("Call") || title.Contains("555") || title.Contains("Phone")))) {
                    foundState = (lower.Contains("incoming") || lower.Contains("ringing")) ? "incoming" : "active";
                    foundCaller = title.Replace("Call on PC", "").Replace("Call from", "").Trim();
                    if (string.IsNullOrEmpty(foundCaller)) foundCaller = "Phone Link Call";
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

            return true;
        }, IntPtr.Zero);

        // Fallback: Check PhoneExperienceHost UI Automation children if EnumWindows missed UWP window
        if (foundState == null) {
            try {
                Process[] pList = Process.GetProcessesByName("PhoneExperienceHost");
                foreach (var p in pList) {
                    AutomationElement root = AutomationElement.RootElement;
                    PropertyCondition pCond = new PropertyCondition(AutomationElement.ProcessIdProperty, p.Id);
                    AutomationElementCollection children = root.FindAll(TreeScope.Children, pCond);
                    foreach (AutomationElement child in children) {
                        string cName = child.Current.Name;
                        if (!string.IsNullOrEmpty(cName)) {
                            string cLower = cName.ToLower();
                            if (cName.Contains("Call") || cName.Contains("555") || cLower.Contains("calling") || cLower.Contains("incoming")) {
                                foundState = cLower.Contains("incoming") || cLower.Contains("ringing") ? "incoming" : "active";
                                foundCaller = cName.Replace("Call on PC", "").Trim();
                                if (string.IsNullOrEmpty(foundCaller)) foundCaller = "Phone Link Call";
                                foundSource = "Phone Link";
                                break;
                            }
                        }
                    }
                    if (foundState != null) break;
                }
            } catch {}
        }

        if (foundState != null) {
            Console.WriteLine(string.Format("{0}|{1}|{2}", foundState, foundCaller, foundSource));
        }
    }
}
