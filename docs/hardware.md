---
title: "Raspberry Pi hardware audit"
date: 2026-11-22
type: reference
status: done
tags: [wal.funk_891, pi, hardware]
---

> Audited 2026-11-22 over SSH with `pi_audit.sh` (read-only). Gate: PASS. See STATUS.md for caveats.

# Hardware audit: emergence-pi5

Run at 2026-11-22T22:45:22+01:00 (TZ=Europe/Berlin)

## Board

```
Raspberry Pi 5 Model B Rev 1.1
Revision	: d04171
Serial	: (redacted)
```

## OS and kernel

```
Linux emergence-pi5 6.18.33+rpt-rpi-2712 #1 SMP PREEMPT Debian 1:6.18.33-1+rpt1 (2026-06-01) aarch64 GNU/Linux
PRETTY_NAME="Debian GNU/Linux 13 (trixie)"
VERSION_CODENAME=trixie
userland: 64-bit, dpkg arch: arm64
```

## CPU

```
4
CPU(s):                                  4
On-line CPU(s) list:                     0-3
Model name:                              Cortex-A76
CPU(s) scaling MHz:                      100%
CPU max MHz:                             2400.0000
CPU min MHz:                             1500.0000
NUMA node0 CPU(s):                       0-3
NUMA node1 CPU(s):                       0-3
NUMA node2 CPU(s):                       0-3
NUMA node3 CPU(s):                       0-3
NUMA node4 CPU(s):                       0-3
NUMA node5 CPU(s):                       0-3
NUMA node6 CPU(s):                       0-3
NUMA node7 CPU(s):                       0-3
governor: ondemand
```

## Memory

```
               total        used        free      shared  buff/cache   available
Mem:           7.9Gi       302Mi       7.3Gi        13Mi       376Mi       7.6Gi
Swap:          2.0Gi          0B       2.0Gi
main: line 8: swapon: command not found
(command failed: swapon --show)
```

## Storage

```
Filesystem      Size  Used Avail Use% Mounted on
/dev/nvme0n1p2  235G  5.2G  220G   3% /
/dev/nvme0n1p1  505M   68M  437M  14% /boot/firmware
NAME          SIZE TYPE TRAN   MODEL                      MOUNTPOINT
loop0           2G loop                                   
zram0           2G disk                                   [SWAP]
nvme0n1     238.5G disk nvme   SAMSUNG MZ9LQ256HBJD-00BVL 
├─nvme0n1p1   512M part nvme                              /boot/firmware
└─nvme0n1p2   238G part nvme                              /
/dev/nvme0n1p2 ext4 rw,noatime
```

## Power and throttling

```
throttled=0x0
     EXT5V_V volt(24)=5.00624000V
usb_max_current_enable=0
```

## Temperature, clocks, fan

```
temp=54.3'C
frequency(0)=2400020480
pwmfan fan1_input: 0 rpm
pwm-fan: state 2/4
```

## Load and running services

```
 22:45:22 up 19 min,  1 user,  load average: 0.60, 0.43, 0.29
avahi-daemon.service
bluetooth.service
cron.service
dbus.service
NetworkManager.service
serial-getty@ttyAMA10.service
ssh.service
systemd-journald.service
systemd-logind.service
systemd-timesyncd.service
systemd-udevd.service
user@1000.service
wpa_supplicant.service
    PID %CPU %MEM COMMAND
   2527 42.8  0.1 systemd
   2522  2.0  0.1 sshd-session
     41  0.2  0.0 pr/ttyAMA-1
      1  0.1  0.1 systemd
    613  0.0  0.0 dbus-daemon
    296  0.0  0.1 systemd-journal
    609  0.0  0.0 avahi-daemon
```

## Network (outbound only)

```
eth0             DOWN           
wlan0            UP             192.168.178.69/24 2001:9e8:6c8c:8600:744d:d711:b839:975d/64 fde9:db6e:3f3e:0:e5b1:a72f:d1:450b/64 fe80::8176:5644:f1b6:8fe8/64 
MBARI S3 HTTP 200 in 1.642859s
```

## Python and tools

```
python3  Python 3.13.5
uv       not installed
git      not installed
```

## Journald storage

```
Storage not set (default: auto)
Archived and active journals take up 9.2M in the file system.
```
