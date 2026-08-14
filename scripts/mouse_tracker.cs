using System;
using System.Runtime.InteropServices;
using System.Threading;

class MouseTracker {
    [DllImport("user32.dll")]
    static extern short GetAsyncKeyState(int vKey);

    const int VK_LBUTTON = 0x01;
    const int VK_RBUTTON = 0x02;
    const int VK_MBUTTON = 0x04;

    static bool IsDown(int key) {
        return (GetAsyncKeyState(key) & 0x8000) != 0;
    }

    static void Main() {
        int previous = -1;

        while (true) {
            int buttons = 0;
            if (IsDown(VK_LBUTTON)) buttons |= 1;
            if (IsDown(VK_RBUTTON)) buttons |= 2;
            if (IsDown(VK_MBUTTON)) buttons |= 4;

            if (buttons != previous) {
                string evt = buttons == 0 ? "up" : "down";
                string button = (buttons & 1) != 0 ? "left" : (buttons & 2) != 0 ? "right" : (buttons & 4) != 0 ? "middle" : "";
                Console.WriteLine(buttons + "|" + evt + "|" + button);
                Console.Out.Flush();
                previous = buttons;
            }

            Thread.Sleep(16);
        }
    }
}
