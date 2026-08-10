# Caroline 2.4.0

**Caroline 2.4.0** is a cross-platform music and Apple-device management project designed for **Windows 11** and **macOS**.

## Supported Systems

### Windows

* Windows 11
* iTunes 12.x
* PowerShell
* Apple devices recognized by iTunes

### macOS

* macOS
* Apple Music app
* Apple devices recognized by Finder/Music
* AppleScript
* Shell scripts

## Features

### Music

* Music library management
* Music categories
* Genre-based organization
* Music configuration using `musiconfig.json`
* Backup of Music/iTunes library data

### Apple Devices

* Detect connected iPhone/iPad/iPod
* Wait until the device is recognized
* Start supported synchronization
* Monitor device connection
* Continue waiting for the next device

### Backups

Backups can use dated folders such as:

```text
2026-08-08_09-30-15/
```

Example structure:

```text
Caroline/
├── README.md
├── Windows/
│   ├── iTunesAutoBackup.ps1
│   ├── iTunesAutoSync.ps1
│   └── iTunesDeviceMonitor.ps1
│
├── macOS/
│   ├── MusicDeviceMonitor.applescript
│   └── loginproviders.sh
│
├── config/
│   └── musiconfig.json
│
└── Backups/
    ├── 2026-08-08_09-30-15/
    └── Logs/
```

## Account Sign-In

Caroline can launch official sign-in pages for:

* Google
* Yahoo
* Apple Account
* Apple App Store

Caroline **does not store passwords, authentication tokens, or Screen Time passcodes**.

Sign-in should always be completed through the official Apple, Google, or Yahoo interface.

## Screen Time

Caroline does not bypass Screen Time restrictions or attempt to recover protected passcodes.

Supported Screen Time information is handled only through Apple's normal backup and restore mechanisms.

## Apple Account

Apple Account credentials are never written to:

* JSON configuration files
* Backup logs
* Device logs
* Music configuration files

## Configuration

The main configuration file is:

```text
config/musiconfig.json
```

Example:

```json
{
  "application": {
    "name": "Caroline",
    "version": "2.4.0"
  },
  "monitor": {
    "enabled": true,
    "checkIntervalSeconds": 5,
    "waitForNextDevice": true
  },
  "backup": {
    "enabled": true,
    "createDatedFolders": true
  },
  "logging": {
    "enabled": true
  }
}
```

## Logs

Logs are stored separately from configuration and may contain:

* Start time
* iTunes/Music status
* Device detected
* Device disconnected
* Backup started
* Backup completed
* Sync status
* Errors

Passwords and authentication credentials are not logged.

## Windows Usage

Open PowerShell and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\Windows\iTunesAutoBackup.ps1
```

## macOS Usage

Open **Script Editor** for the AppleScript version, or use Terminal for shell scripts.

Example:

```bash
chmod +x ./macOS/loginproviders.sh
./macOS/loginproviders.sh
```

## Safety

Caroline is designed to preserve the original data whenever possible.

The backup scripts:

* Copy rather than delete original Music/iTunes data
* Create dated backup folders
* Keep logs
* Do not store passwords
* Do not bypass Apple security
* Do not bypass Activation Lock
* Do not bypass Screen Time

## Version

**Caroline 2.4.0**

Platform:

**Windows 11 + macOS**

Project type:

**Music / Apple Device Backup & Management**
