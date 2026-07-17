// DanceSchoolMS.exe — portable launcher for the Dance School Management System.
//
// What it does when double-clicked:
//   1. Starts the bundled Node.js server (runtime\node.exe app\server.js) with the
//      database and session secret wired up via environment variables.
//   2. Waits until the server answers, then opens the default browser.
//   3. Stays open; closing the window stops the server.
//
// Compiled by scripts/package-win.ps1 with the C# compiler that ships with
// Windows (.NET Framework csc.exe), so it needs C# 5 syntax only.

using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

static class Launcher
{
    static Process child;
    static readonly object logLock = new object();

    static int Main()
    {
        Console.Title = "Dance School Management System";
        WriteBanner();

        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string appDir = Path.Combine(baseDir, "app");
        string dataDir = Path.Combine(baseDir, "data");
        string nodeExe = Path.Combine(baseDir, "runtime", "node.exe");
        string serverJs = Path.Combine(appDir, "server.js");
        string dbFile = Path.Combine(dataDir, "dance-school.db");

        if (!File.Exists(nodeExe) || !File.Exists(serverJs) || !File.Exists(dbFile))
        {
            Console.WriteLine("ERROR: Program files are missing.");
            Console.WriteLine("Please extract the WHOLE zip folder and run DanceSchoolMS.exe from inside it.");
            return Pause(1);
        }

        string port = ReadOptionalFile(Path.Combine(dataDir, "port.txt"), "3999");
        // Always use the literal loopback IP the server binds to. "localhost" can
        // resolve to IPv6 ::1 first, and on machines where ::1 connects hang
        // (firewall/AV filter drivers) the health check would time out forever
        // even though the server is healthy.
        string url = "http://127.0.0.1:" + port;

        if (Responds(url + "/login"))
        {
            Console.WriteLine("The system is already running — opening it in your browser.");
            OpenBrowser(url);
            return Pause(0);
        }

        // Each installation gets its own persistent session secret on first run.
        string secretFile = Path.Combine(dataDir, "secret.txt");
        string secret;
        if (File.Exists(secretFile))
        {
            secret = File.ReadAllText(secretFile).Trim();
        }
        else
        {
            secret = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
            File.WriteAllText(secretFile, secret);
        }

        ProcessStartInfo psi = new ProcessStartInfo();
        psi.FileName = nodeExe;
        psi.Arguments = "server.js";
        psi.WorkingDirectory = appDir;
        psi.UseShellExecute = false;
        psi.CreateNoWindow = true;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;
        psi.EnvironmentVariables["DATABASE_URL"] = "file:" + dbFile.Replace('\\', '/');
        psi.EnvironmentVariables["SESSION_SECRET"] = secret;
        psi.EnvironmentVariables["PORT"] = port;
        psi.EnvironmentVariables["HOSTNAME"] = "127.0.0.1";
        psi.EnvironmentVariables["NODE_ENV"] = "production";

        string logFile = Path.Combine(dataDir, "server.log");
        StreamWriter log = new StreamWriter(logFile, false, Encoding.UTF8);
        log.AutoFlush = true;

        child = new Process();
        child.StartInfo = psi;
        child.OutputDataReceived += delegate(object s, DataReceivedEventArgs e)
        {
            if (e.Data != null) lock (logLock) log.WriteLine(e.Data);
        };
        child.ErrorDataReceived += delegate(object s, DataReceivedEventArgs e)
        {
            if (e.Data != null) lock (logLock) log.WriteLine(e.Data);
        };

        AppDomain.CurrentDomain.ProcessExit += delegate { KillChild(); };
        Console.CancelKeyPress += delegate(object s, ConsoleCancelEventArgs e) { KillChild(); };

        Console.WriteLine("Starting the server (first start can take ~10 seconds)...");
        child.Start();
        AssignToKillOnCloseJob(child);
        child.BeginOutputReadLine();
        child.BeginErrorReadLine();

        bool up = false;
        for (int i = 0; i < 120; i++)
        {
            if (child.HasExited) break;
            if (Responds(url + "/login")) { up = true; break; }
            Thread.Sleep(500);
        }

        if (!up)
        {
            Console.WriteLine();
            Console.WriteLine("ERROR: The server did not start.");
            Console.WriteLine("Details were saved to: " + logFile);
            Console.WriteLine("(A common cause is another program already using port " + port + ".");
            Console.WriteLine(" You can change the port by creating data\\port.txt containing e.g. 4200.");
            Console.WriteLine(" If the log above says the server was Ready, try opening " + url + " manually.)");
            KillChild();
            return Pause(1);
        }

        OpenBrowser(url);
        Console.WriteLine();
        Console.WriteLine("  Running at:  " + url);
        Console.WriteLine("  Sign-in accounts are listed in UAT-GUIDE.txt.");
        Console.WriteLine();
        Console.WriteLine("  KEEP THIS WINDOW OPEN while using the system.");
        Console.WriteLine("  Close this window to stop the server.");
        Console.WriteLine();

        child.WaitForExit();
        lock (logLock) log.Close();
        return 0;
    }

    static void WriteBanner()
    {
        Console.WriteLine("==========================================");
        Console.WriteLine("   Dance School Management System");
        Console.WriteLine("==========================================");
        Console.WriteLine();
    }

    static void KillChild()
    {
        try { if (child != null && !child.HasExited) child.Kill(); }
        catch { }
    }

    // ----- Job object: the OS kills the server whenever this launcher exits, -----
    // ----- even if the launcher itself is force-terminated.                  -----

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

    [DllImport("kernel32.dll")]
    static extern bool SetInformationJobObject(IntPtr hJob, int infoClass, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION lpInfo, int cbInfoLength);

    [DllImport("kernel32.dll")]
    static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit, PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass, SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct IO_COUNTERS
    {
        public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount, ReadTransferCount, WriteTransferCount, OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed;
    }

    const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;
    const int JobObjectExtendedLimitInformation = 9;
    static IntPtr jobHandle = IntPtr.Zero; // kept alive for the launcher's lifetime

    static void AssignToKillOnCloseJob(Process process)
    {
        try
        {
            jobHandle = CreateJobObject(IntPtr.Zero, null);
            if (jobHandle == IntPtr.Zero) return;
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            if (SetInformationJobObject(jobHandle, JobObjectExtendedLimitInformation, ref info, Marshal.SizeOf(info)))
            {
                AssignProcessToJobObject(jobHandle, process.Handle);
            }
        }
        catch { } // best effort — the ProcessExit handler still covers normal window close
    }

    static void OpenBrowser(string url)
    {
        try { Process.Start(url); }
        catch
        {
            Console.WriteLine("Please open this address in your browser: " + url);
        }
    }

    static string ReadOptionalFile(string path, string fallback)
    {
        try
        {
            if (File.Exists(path))
            {
                string value = File.ReadAllText(path).Trim();
                if (value.Length > 0) return value;
            }
        }
        catch { }
        return fallback;
    }

    static bool Responds(string url)
    {
        try
        {
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Timeout = 1500;
            req.Proxy = null;
            req.Method = "GET";
            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
            {
                return (int)resp.StatusCode == 200;
            }
        }
        catch { return false; }
    }

    static int Pause(int code)
    {
        Console.WriteLine();
        Console.WriteLine("Press any key to close this window...");
        try { Console.ReadKey(true); } catch { }
        return code;
    }
}
