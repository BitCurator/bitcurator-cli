![Logo](https://github.com/BitCurator/bitcurator.github.io/blob/main/logos/BitCurator-Basic-400px.png)

# bitcurator-cli

[![GitHub issues](https://img.shields.io/github/issues/bitcurator/bitcurator-salt.svg)](https://github.com/bitcurator/bitcurator-salt/issues)
[![GitHub forks](https://img.shields.io/github/forks/bitcurator/bitcurator-salt.svg)](https://github.com/bitcurator/bitcurator-salt/network)
[![Twitter Follow](https://img.shields.io/twitter/follow/bitcurator.svg?style=social&label=Follow)](https://twitter.com/bitcurator)

BitCurator CLI Installer

This repo contains the source for the BitCurator CLI installer, a command line tool to install and upgrade the BitCurator environment.

You can find pre-built virtual machines (Ubuntu 22.04-based) at https://github.com/BitCurator/bitcurator-distro/wiki/Releases for specific releases. If you wish to create the environment from scratch, you can follow the steps below to install the BitCurator environment on your own physical host or VM.

**Note: BitCurator must be deployed on an x86/amd64 version of Ubuntu. Currently, it is not possible to deploy it on systems with ARM processors (including Apple M1).**

**1. Install Ubuntu 22.04**

Download the 64-bit Ubuntu 22.04 desktop image from https://releases.ubuntu.com/22.04/ubuntu-22.04-desktop-amd64.iso and install on your local machine or in a VM. If you're using a VM, we recommend allocating at least 4GB of RAM and 64GB of disk space to the instance.

To remain consistent with the default configuration of BitCurator, when prompted use **BitCurator** for the Full Name, **bcadmin** for the username, and **bcadmin** for the password.

When installation is completed, reboot, log in, and open a terminal.

**2. Download the BitCurator CLI Installer**

Download the BitCurator installer from iBiblio with the following command:

```shell
wget https://distro.ibiblio.org/bitcurator/bitcurator-cli-linux
```

Verify that the SHA-256 has of the downloaded file matches the value below:

```shell
377065fd9880e511c3c5db7306c5b40dd507ba491a89452cf05f2b570946c5c0
```

You can generate the hash of your downloaded file with:

```shell
sha256sum bitcurator-cli-linux
```

Finally, perform a few setup steps to make the installer executable and place it in the correct location:

```shell
mv bitcurator-cli-linux bitcurator
chmod +x bitcurator
sudo mv bitcurator /usr/local/bin
```

**3. Install GnuPG**
GnuPG is required for BitCurator to automatically validate the configuration files required during installation. Install it using:

```
sudo apt install -y gnupg
```

**4. Run the BitCurator Installer**

```
sudo bitcurator install
```

The installation may take up to an hour, depending on the speed of your system.

If you encounter an error, you may be able to identify the issue by reviewing saltstack.log file under /var/cache/bitcurator/cli in the subdirectory that matches the BitCcurator state-files version you're installing. Search for the log file for result: false messages and look at the surrounding 5 lines or the 8 lines above each message to see the state file that caused the issue. You can do this with:

```shell
grep -i -C 5 'result: false' or grep -i -B 8 'result: false'
```

**5. Reboot**

When the installation is complete, reboot your system from the terminal:

```shell
sudo reboot
```

After the reboot, you will be automatically logged in to BitCurator.

## BitCurator documentation, help, and other information

User documentation and additional resources are available on
[the BitCurator Environment wiki](https://confluence.educopia.org/display/BC).

Questions and comments can also be directed to the bitcurator-users list.

[https://groups.google.com/d/forum/bitcurator-users](https://groups.google.com/d/forum/bitcurator-users)

## Acknowledgements

This tool originally authored by Erik Kristensen, and revised for BitCurator by Corey Forman.

## License(s)

See LICENSE file for details. 

The BitCurator logo, BitCurator project documentation, and other non-software products of the BitCurator team are subject to the the Creative Commons Attribution 4.0 Generic license (CC By 4.0).

## Development Team and Support

The BitCurator environment is a product of the BitCurator team housed at the School of Information and Library Science at the University of North Carolina at Chapel Hill. Funding between 2011 and 2014 was provided by the Andrew W. Mellon Foundation.

Ongoing support for the BitCurator environment is managed by the BitCurator Consortium. Find out more at:

http://www.bitcuratorconsortium.net/

