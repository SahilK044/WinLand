using System;
using System.Text;
using System.Text.RegularExpressions;
using System.Runtime.InteropServices;
using System.Windows.Automation;
using System.Diagnostics;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

class Program {
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    static extern bool SetCursorPos(int x, int y);

    [DllImport("user32.dll")]
    static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

    [DllImport("user32.dll")]
    static extern int GetSystemMetrics(int nIndex);

    [DllImport("user32.dll")]
    static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    static extern bool SetProcessDPIAware();

    const uint WM_CLOSE = 0x0010;

    [STAThread]
    static void Main(string[] args) {
        try {
            SetProcessDPIAware();
        } catch {}

        try {
            if (args.Length > 0 && !string.IsNullOrWhiteSpace(args[0])) {
                PerformCallAction(args[0].Trim().ToLowerInvariant());
                return;
            }

            List<AutomationElement> targetWindows = GetTargetWindows();

            foreach (AutomationElement win in targetWindows) {
                try {
                    AutomationElementCollection nodes = win.FindAll(TreeScope.Descendants, Condition.TrueCondition);
                    AutomationElement actionNode = null;
                    List<string> allNames = new List<string>();
                    bool isHistoryOrDashboard = false;

                    foreach (AutomationElement n in nodes) {
                        try {
                            if (n.Current.IsOffscreen) continue;
                            System.Windows.Rect r = n.Current.BoundingRectangle;
                            if (r == System.Windows.Rect.Empty || r.Width <= 0 || r.Height <= 0) continue;

                            string name = n.Current.Name ?? "";
                            string autoId = n.Current.AutomationId ?? "";
                            string helpText = n.Current.HelpText ?? "";
                            string combined = (name + " " + autoId + " " + helpText).Trim();
                            string lower = combined.ToLowerInvariant();

                            if (lower.Contains("search your contacts") || lower.Contains("no new notifications") ||
                                lower.Contains("clear all") || lower.Contains("call history") ||
                                lower.Contains("recent calls") || lower == "outgoing" || lower == "missed") {
                                isHistoryOrDashboard = true;
                            }

                            if (!string.IsNullOrEmpty(combined) && !allNames.Contains(combined)) {
                                allNames.Add(combined);
                            }

                            if (IsActiveCallActionOrStatus(n)) {
                                if (actionNode == null) actionNode = n;
                            }
                        } catch {}
                    }

                    if (actionNode == null) continue;

                    bool isIncoming = allNames.Exists(n => {
                        string l = n.ToLowerInvariant();
                        return l == "answer" || l == "accept" || l.Contains("answer call") || l.Contains("accept call");
                    });

                    string state = isIncoming ? "incoming" : "active";
                    string callerName = ExtractCallerNameFromCallContainer(win, actionNode, allNames);

                    if (callerName == "Phone call" && isHistoryOrDashboard && !isIncoming) {
                        continue;
                    }

                    string avatarPath = ExtractAvatarPathFromContainer(win, actionNode);

                    string output = state + "|" + callerName + "|Phone Link";
                    if (!string.IsNullOrEmpty(avatarPath)) output += "|" + avatarPath;

                    Console.WriteLine(output);
                    return;
                } catch {}
            }
        } catch {}
    }

    static bool IsActiveCallActionOrStatus(AutomationElement n) {
        try {
            if (n.Current.IsOffscreen) return false;
            string name = (n.Current.Name ?? "").Trim();
            string autoId = (n.Current.AutomationId ?? "").Trim();
            string helpText = (n.Current.HelpText ?? "").Trim();
            ControlType ct = n.Current.ControlType;
            string combined = (name + " " + autoId + " " + helpText).ToLowerInvariant();

            if (combined.Contains("outgoing") || combined.Contains("missed") || combined.Contains("history") ||
                combined.Contains("search") || combined.Contains("clear all") || combined.Contains("dialpad")) {
                return false;
            }

            if (combined.Contains("answer") || combined.Contains("accept")) {
                return true;
            }

            if (ct == ControlType.Button || ct == ControlType.Custom || ct == ControlType.Hyperlink) {
                if (name.Equals("End call", StringComparison.OrdinalIgnoreCase) ||
                    name.Equals("Hang up", StringComparison.OrdinalIgnoreCase) ||
                    name.Equals("Decline", StringComparison.OrdinalIgnoreCase) ||
                    name.Equals("End", StringComparison.OrdinalIgnoreCase) ||
                    combined.Contains("endcall") || combined.Contains("hangup") ||
                    combined.Contains("end call") || combined.Contains("decline")) {
                    return true;
                }
            }

            if (name.Equals("Calling...", StringComparison.OrdinalIgnoreCase) ||
                name.Equals("In call", StringComparison.OrdinalIgnoreCase) ||
                name.Equals("Dialing...", StringComparison.OrdinalIgnoreCase) ||
                name.StartsWith("Call on ", StringComparison.OrdinalIgnoreCase) ||
                name.StartsWith("In call with", StringComparison.OrdinalIgnoreCase)) {
                return true;
            }
        } catch {}
        return false;
    }

    static string ExtractAvatarPathFromContainer(AutomationElement win, AutomationElement actionNode) {
        try {
            List<AutomationElement> searchList = new List<AutomationElement>();
            if (actionNode != null) {
                try {
                    TreeWalker walker = TreeWalker.ControlViewWalker;
                    AutomationElement parent = walker.GetParent(actionNode);
                    if (parent != null) {
                        searchList.Add(parent);
                        AutomationElement grandParent = walker.GetParent(parent);
                        if (grandParent != null) searchList.Add(grandParent);
                    }
                } catch {}
            }
            searchList.Add(win);

            foreach (AutomationElement c in searchList) {
                try {
                    AutomationElementCollection allDescendants = c.FindAll(TreeScope.Descendants, Condition.TrueCondition);
                    List<AutomationElement> imageCandidates = new List<AutomationElement>();

                    foreach (AutomationElement node in allDescendants) {
                        try {
                            if (node.Current.IsOffscreen) continue;
                            ControlType ct = node.Current.ControlType;
                            string name = node.Current.Name ?? "";
                            string helpText = node.Current.HelpText ?? "";
                            string autoId = node.Current.AutomationId ?? "";
                            string className = node.Current.ClassName ?? "";
                            System.Windows.Rect rect = node.Current.BoundingRectangle;

                            string candidateText = !string.IsNullOrEmpty(helpText) ? helpText : name;
                            if (!string.IsNullOrEmpty(candidateText) &&
                                (candidateText.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                                 candidateText.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                                 candidateText.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) ||
                                 candidateText.StartsWith("file://", StringComparison.OrdinalIgnoreCase) ||
                                 candidateText.StartsWith("http", StringComparison.OrdinalIgnoreCase))) {
                                return candidateText;
                            }

                            string combinedAttr = (autoId + " " + className + " " + name + " " + helpText).ToLowerInvariant();
                            bool isExplicitAvatar = combinedAttr.Contains("avatar") || combinedAttr.Contains("personpicture") ||
                                                    combinedAttr.Contains("profile") || combinedAttr.Contains("picture") ||
                                                    combinedAttr.Contains("contact") || combinedAttr.Contains("photo") ||
                                                    ct == ControlType.Image;

                            if (rect != System.Windows.Rect.Empty && rect.Width >= 24 && rect.Height >= 24 && rect.Width <= 240 && rect.Height <= 240) {
                                double ratio = rect.Width / rect.Height;
                                if (ratio >= 0.7 && ratio <= 1.4) {
                                    if (isExplicitAvatar) {
                                        imageCandidates.Insert(0, node); // High priority
                                    } else if (ct != ControlType.Text && ct != ControlType.TitleBar && ct != ControlType.Window && ct != ControlType.Button) {
                                        imageCandidates.Add(node);
                                    }
                                }
                            }
                        } catch {}
                    }

                    foreach (AutomationElement imgNode in imageCandidates) {
                        try {
                            System.Windows.Rect r = imgNode.Current.BoundingRectangle;
                            string base64Data = CaptureNodeBase64(r);
                            if (!string.IsNullOrEmpty(base64Data)) return base64Data;
                        } catch {}
                    }
                } catch {}
            }
        } catch {}
        return null;
    }

    static string CaptureNodeBase64(System.Windows.Rect rect) {
        try {
            int x = (int)rect.Left;
            int y = (int)rect.Top;
            int w = (int)rect.Width;
            int h = (int)rect.Height;

            if (w <= 0 || h <= 0) return null;

            using (Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(bmp)) {
                    g.CopyFromScreen(x, y, 0, 0, new Size(w, h), CopyPixelOperation.SourceCopy);
                }

                // Verify captured region contains actual graphic content (not solid dark layout pane)
                int nonDarkPixels = 0;
                int totalSamples = 0;
                int stepX = Math.Max(1, w / 10);
                int stepY = Math.Max(1, h / 10);

                for (int sx = 0; sx < w; sx += stepX) {
                    for (int sy = 0; sy < h; sy += stepY) {
                        Color p = bmp.GetPixel(sx, sy);
                        totalSamples++;
                        if (p.R > 35 || p.G > 35 || p.B > 35) {
                            nonDarkPixels++;
                        }
                    }
                }

                if (totalSamples > 0 && ((double)nonDarkPixels / totalSamples) < 0.12) {
                    return null; // Skip empty/dark container capture
                }

                using (MemoryStream ms = new MemoryStream()) {
                    bmp.Save(ms, ImageFormat.Png);
                    return "data:image/png;base64," + Convert.ToBase64String(ms.ToArray());
                }
            }
        } catch {
            return null;
        }
    }

    static string ExtractCallerNameFromCallContainer(AutomationElement win, AutomationElement actionNode, List<string> allNames) {
        try {
            List<AutomationElement> containerSearchList = new List<AutomationElement>();

            if (actionNode != null) {
                try {
                    TreeWalker walker = TreeWalker.ControlViewWalker;
                    AutomationElement parent = walker.GetParent(actionNode);
                    if (parent != null) {
                        containerSearchList.Add(parent);
                        AutomationElement grandParent = walker.GetParent(parent);
                        if (grandParent != null) containerSearchList.Add(grandParent);
                    }
                } catch {}
            }
            containerSearchList.Add(win);

            foreach (AutomationElement container in containerSearchList) {
                try {
                    AutomationElementCollection textNodes = container.FindAll(TreeScope.Descendants, 
                        new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Text));

                    foreach (AutomationElement tn in textNodes) {
                        try {
                            if (tn.Current.IsOffscreen) continue;
                            string t = tn.Current.Name;
                            if (string.IsNullOrWhiteSpace(t)) continue;
                            string trimmed = t.Trim();

                            if (IsCleanCallerName(trimmed)) {
                                return trimmed;
                            }
                        } catch {}
                    }
                } catch {}
            }

            foreach (string name in allNames) {
                if (IsCleanCallerName(name)) return name;
            }
        } catch {}

        return "Phone call";
    }

    static bool IsCleanCallerName(string name) {
        if (string.IsNullOrWhiteSpace(name)) return false;
        if (name.Length < 1 || name.Length > 40) return false;

        if (Regex.IsMatch(name, @"^\d{1,2}$")) return false;
        if (Regex.IsMatch(name, @"^\d{1,2}:\d{2}")) return false;
        if (Regex.IsMatch(name, @"\d{2}-\d{2}-\d{4}")) return false;

        string lower = name.ToLowerInvariant();

        if (lower.Contains("sahil") || lower.Contains("khusro")) return false;

        if (lower == "minimize" || lower == "maximize" || lower == "restore" || lower == "close" ||
            lower == "system menu bar" || lower == "system menu" || lower == "app title" || 
            lower == "title bar" || lower == "navigation" || lower == "back" || lower == "forward" ||
            lower == "settings" || lower == "search" || lower == "help" || lower == "feedback" ||
            lower == "phone link" || lower == "bluetooth" || lower == "bluetooth on" || lower == "bluetooth off" ||
            lower == "expand" || lower == "collapse" || lower == "transfer to pc" || lower == "transfer to phone" ||
            lower == "change progress" || lower == "progress" || lower == "seek" || lower == "slider" ||
            lower == "repeat" || lower == "shuffle" || lower == "volume" || lower == "mute" || lower == "unmute" ||
            lower == "sound" || lower == "speaker" || lower == "microphone" || lower == "audio" ||
            lower == "calling" || lower == "calling..." || lower == "in call" || lower == "dialing" || lower == "dialing..." ||
            lower.Contains("currently in a call") || lower.Contains("mobile device") ||
            lower.Contains("search your contacts") || lower.Contains("no new notifications") ||
            lower.Contains("clear all") || lower.Contains("outgoing") || lower.Contains("incoming") ||
            lower.Contains("missed") || lower.Contains("recent") || lower.Contains("history") ||
            lower.Contains("chrome legacy") || lower.Contains("xaml") || lower.Contains("frame") ||
            lower.Contains("call on") || lower.Contains("microsoft") || lower.Contains("system") ||
            lower.Contains("device") || lower.Contains("button") || lower.Contains("item") ||
            lower.Contains("host") || lower.Contains("textblock") || lower.Contains("popup") ||
            lower.Contains("overlay") || lower.Contains("layout") || lower.Contains("pane") ||
            lower.Contains("group") || lower.Contains("view") || lower.Contains("ultra") ||
            lower.Contains("s24") || lower.Contains("s25") || lower.Contains("s23") ||
            lower.Contains("galaxy") || lower.Contains("iphone") || lower.Contains("pixel") ||
            lower.Contains("oneplus") || lower.Contains("xiaomi") || lower.Contains("connected") ||
            lower.Contains("battery") || lower.Contains("signal") || lower.Contains("notifications") ||
            lower.Contains("messages") || lower.Contains("photos") || lower.Contains("apps") ||
            lower.Contains("calls") || lower.Contains("not supported") || lower.Contains("status")) return false;

        if (name == "Mute" || name == "Unmute" || name == "End" || name == "End call" || 
            name == "Transfer to phone" || name == "Transfer to PC" || name == "Answer" || 
            name == "Decline" || name == "Calling" || name == "Calling..." || name == "In call" || name == "Dialing" ||
            name == "Microphone" || name == "Speaker" || name == "Keypad" || name == "Add call" ||
            name == "Hold" || name == "Mobile" || name == "Home" || name == "Work" || name == "Main" ||
            lower.StartsWith("incoming") || lower.StartsWith("outgoing")) return false;

        return true;
    }

    static List<AutomationElement> GetTargetWindows() {
        List<AutomationElement> priorityPopupWindows = new List<AutomationElement>();
        List<AutomationElement> secondaryWindows = new List<AutomationElement>();
        HashSet<uint> phonePids = new HashSet<uint>();

        foreach (Process p in Process.GetProcesses()) {
            string pName = p.ProcessName;
            if (pName.Equals("PhoneExperienceHost", StringComparison.OrdinalIgnoreCase) ||
                pName.Equals("YourPhoneAppProxy", StringComparison.OrdinalIgnoreCase) ||
                pName.Equals("YourPhone", StringComparison.OrdinalIgnoreCase) ||
                pName.Equals("CrossDeviceExperienceHost", StringComparison.OrdinalIgnoreCase)) {
                phonePids.Add((uint)p.Id);
            }
        }

        EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd) || IsIconic(hWnd)) return true;

            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            StringBuilder sb = new StringBuilder(256);
            GetWindowText(hWnd, sb, 256);
            string t = sb.ToString();

            bool isPhonePid = phonePids.Contains(pid);
            bool isCallTitle = !string.IsNullOrEmpty(t) && 
                (t.StartsWith("Call on", StringComparison.OrdinalIgnoreCase) || 
                 t.StartsWith("Incoming call", StringComparison.OrdinalIgnoreCase) || 
                 t.StartsWith("Call with", StringComparison.OrdinalIgnoreCase) ||
                 t.StartsWith("In call", StringComparison.OrdinalIgnoreCase));

            if (isCallTitle) {
                try {
                    AutomationElement ae = AutomationElement.FromHandle(hWnd);
                    if (ae != null && !ae.Current.IsOffscreen) {
                        priorityPopupWindows.Add(ae);
                    }
                } catch {}
            } else if (isPhonePid && (t.Contains("Call") || t.Contains("Phone"))) {
                try {
                    AutomationElement ae = AutomationElement.FromHandle(hWnd);
                    if (ae != null && !ae.Current.IsOffscreen) {
                        secondaryWindows.Add(ae);
                    }
                } catch {}
            }
            return true;
        }, IntPtr.Zero);

        try {
            AutomationElementCollection rootChildren = AutomationElement.RootElement.FindAll(TreeScope.Children, Condition.TrueCondition);
            foreach (AutomationElement rc in rootChildren) {
                try {
                    if (rc == null || rc.Current.IsOffscreen) continue;
                    string rName = rc.Current.Name ?? "";
                    string rClass = rc.Current.ClassName ?? "";

                    bool isCallPopup = 
                        rName.StartsWith("Call on", StringComparison.OrdinalIgnoreCase) ||
                        rName.StartsWith("Incoming call", StringComparison.OrdinalIgnoreCase) ||
                        rName.StartsWith("Call with", StringComparison.OrdinalIgnoreCase) ||
                        rName.StartsWith("In call", StringComparison.OrdinalIgnoreCase);
                    bool isPhoneLinkToast = 
                        (rClass.Contains("Toast") || rClass.Contains("Popup")) &&
                        (rName.Contains("Phone Link") || rName.Contains("Your Phone"));

                    if (isCallPopup || isPhoneLinkToast) {
                        if (!priorityPopupWindows.Contains(rc)) priorityPopupWindows.Add(rc);
                    }
                } catch {}
            }
        } catch {}

        List<AutomationElement> finalTargets = new List<AutomationElement>();
        finalTargets.AddRange(priorityPopupWindows);
        foreach (AutomationElement sw in secondaryWindows) {
            if (!finalTargets.Contains(sw)) finalTargets.Add(sw);
        }

        return finalTargets;
    }

    static void SendPhysicalClick(int x, int y) {
        try {
            SetCursorPos(x, y);
            System.Threading.Thread.Sleep(40);

            int screenWidth = GetSystemMetrics(0);
            int screenHeight = GetSystemMetrics(1);

            if (screenWidth <= 0) screenWidth = 1920;
            if (screenHeight <= 0) screenHeight = 1080;

            uint normX = (uint)((x * 65535) / screenWidth);
            uint normY = (uint)((y * 65535) / screenHeight);

            const uint MOUSEEVENTF_ABSOLUTE = 0x8000;
            const uint MOUSEEVENTF_MOVE = 0x0001;
            const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
            const uint MOUSEEVENTF_LEFTUP = 0x0004;

            mouse_event(MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_LEFTDOWN, normX, normY, 0, 0);
            System.Threading.Thread.Sleep(40);
            mouse_event(MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_LEFTUP, normX, normY, 0, 0);
        } catch {}
    }

    static void PerformCallAction(string action) {
        try {
            List<IntPtr> allPhoneHandles = new List<IntPtr>();
            HashSet<uint> phonePids = new HashSet<uint>();

            foreach (Process p in Process.GetProcesses()) {
                string pName = p.ProcessName;
                if (pName.Equals("PhoneExperienceHost", StringComparison.OrdinalIgnoreCase) ||
                    pName.Equals("YourPhoneAppProxy", StringComparison.OrdinalIgnoreCase) ||
                    pName.Equals("YourPhone", StringComparison.OrdinalIgnoreCase) ||
                    pName.Equals("CrossDeviceExperienceHost", StringComparison.OrdinalIgnoreCase) ||
                    pName.Equals("ApplicationFrameHost", StringComparison.OrdinalIgnoreCase)) {
                    phonePids.Add((uint)p.Id);
                }
            }

            EnumWindows((hWnd, lParam) => {
                if (!IsWindowVisible(hWnd) || IsIconic(hWnd)) return true;
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                if (phonePids.Contains(pid)) {
                    allPhoneHandles.Add(hWnd);
                }
                return true;
            }, IntPtr.Zero);

            foreach (IntPtr hWnd in allPhoneHandles) {
                try {
                    AutomationElement win = AutomationElement.FromHandle(hWnd);
                    if (win == null) continue;

                    AutomationElementCollection nodes = win.FindAll(TreeScope.Descendants, Condition.TrueCondition);
                    foreach (AutomationElement n in nodes) {
                        try {
                            if (n.Current.IsOffscreen) continue;

                            ControlType ct = n.Current.ControlType;
                            if (ct == ControlType.TitleBar || ct == ControlType.Window) continue;

                            string name = n.Current.Name ?? "";
                            string autoId = n.Current.AutomationId ?? "";
                            string helpText = n.Current.HelpText ?? "";

                            string combined = (name + " " + autoId + " " + helpText).Trim();
                            string lower = combined.ToLowerInvariant();

                            if (lower == "close" || lower == "minimize" || lower == "maximize" || 
                                lower == "restore" || lower.Contains("titlebar") || lower.Contains("title bar")) {
                                continue;
                            }

                            bool isMatch = false;

                            if (action == "decline" || action == "end") {
                                if (lower.Contains("decline") || lower.Contains("end call") || 
                                    lower == "end" || autoId.ToLowerInvariant().Contains("endcall") ||
                                    autoId.ToLowerInvariant().Contains("decline") ||
                                    autoId.ToLowerInvariant().Contains("hangup") ||
                                    lower.Contains("hang") || lower.Contains("disconnect")) {
                                    isMatch = true;
                                }
                            }
                            else if (action == "accept" || action == "answer") {
                                if (lower.Contains("answer") || lower.Contains("accept") || autoId.ToLowerInvariant().Contains("answer")) {
                                    isMatch = true;
                                }
                            }
                            else if (action == "mute") {
                                if (lower.Contains("mute") || lower.Contains("mic") || autoId.ToLowerInvariant().Contains("mute")) {
                                    isMatch = true;
                                }
                            }

                            if (isMatch) {
                                object patternObj;
                                if (n.TryGetCurrentPattern(InvokePattern.Pattern, out patternObj)) {
                                    ((InvokePattern)patternObj).Invoke();
                                    return;
                                }

                                object toggleObj;
                                if (n.TryGetCurrentPattern(TogglePattern.Pattern, out toggleObj)) {
                                    ((TogglePattern)toggleObj).Toggle();
                                    return;
                                }

                                System.Windows.Rect rect = n.Current.BoundingRectangle;
                                if (rect != System.Windows.Rect.Empty && rect.Width > 0 && rect.Height > 0) {
                                    int x = (int)(rect.Left + rect.Width / 2);
                                    int y = (int)(rect.Top + rect.Height / 2);
                                    SendPhysicalClick(x, y);
                                    return;
                                }
                            }
                        } catch {}
                    }
                } catch {}
            }

            if (action == "end" || action == "decline") {
                foreach (IntPtr hWnd in allPhoneHandles) {
                    try {
                        StringBuilder sbT = new StringBuilder(256);
                        GetWindowText(hWnd, sbT, 256);
                        string t = sbT.ToString();
                        if (t.StartsWith("Call") || t.Contains("Incoming")) {
                            PostMessage(hWnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
                        }
                    } catch {}
                }
            }
        } catch {}
    }
}
