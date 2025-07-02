const cfg = require('./config.json')
const os = require('os')
const fs = require('fs').promises
const fsSync = require('fs')
const child_process = require('child_process')
const { promisify } = require('util')
const crypto = require('crypto')
const spawn = require('child_process').spawn
const docopt = require('docopt').docopt
const { Octokit } = require('@octokit/rest')
const { mkdirp } = require('mkdirp')
const openpgp = require('openpgp')
const username = require('username')
const readline = require('readline')
const split = require('split')
const execAsync = promisify(child_process.exec)
const yaml = require('js-yaml')

const currentUser = process.env.SUDO_USER || username.sync()

const doc = `
Usage:
  bitcurator [options] list-upgrades [--pre-release]
  bitcurator [options] install [--pre-release] [--version=<version>] [--mode=<mode>] [--user=<user>]
  bitcurator [options] upgrade [--pre-release] [--mode=<mode>] [--user=<user>]
  bitcurator [options] results [--version=<version>]
  bitcurator [options] version
  bitcurator [options] debug
  bitcurator -h | --help | -v

Options:
  --dev                 Developer Mode (do not use, dangerous, bypasses checks)
  --version=<version>   Specific version install [default: latest]
  --mode=<mode>         bitcurator installation mode (dedicated or addon, default: dedicated)
  --user=<user>         User used for bitcurator configuration [default: ${currentUser}]
  --no-cache            Ignore the cache, always download the release files
  --verbose             Display verbose logging
`

const saltstackVersion = '3006'
const pubKey = `
Version: GnuPG

-----BEGIN PGP PUBLIC KEY BLOCK-----

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
NPeomXepvesHWoZRm6rNus5cKVt7V2A4
=9mn9
-----END PGP PUBLIC KEY BLOCK-----
`

const getHelpText = () => {
  return `
Try rebooting your system and trying the operation again.

Sometimes problems occur due to network or server issues when
downloading packages, in which case retrying your operation
a bit later might lead to a better result.
Additionally, if you are operating behind a proxy, you may
need to configure your environment to allow access through
the proxy.

To determine the nature of the issue, please review the
saltstack.log file under ${cfg.logPath}
in the subdirectory that matches the bitcurator release version
that you're installing.

Pay particular attention to lines that start with [ERROR], or
which come before the line "result: false".
`
};

let cachePath = '/var/cache/bitcurator/cli'
let versionFile = '/etc/bitcurator-version'
let configFile = '/etc/bitcurator-config'
let releaseFile = '/etc/os-release'
let bitcuratorConfiguration = {}

const validModes = ['dedicated','addon']
let isModeSpecified = false

const cli = docopt(doc)

const github = new Octokit({
  version: '3.0.0',
  validateCache: true,
})

const error = (err) => {
  console.log('')
  console.log(err.message)
  console.log(err.stack)
  console.log(getHelpText())
  process.exit(1)
}

//async function fileExists(path) {
//  try {
//    await fs.access(path);
//    return true;
//  } catch {
//    return false;
//  }
//}

const setup = async () => {
  if (cli['--dev'] === true) {
    cachePath = '/tmp/var/cache/bitcurator'
    versionFile = '/tmp/bitcurator-version'
    configFile = '/tmp/bitcurator-config'
    releaseFile = '/tmp/os-release'
  }

  await mkdirp(cachePath)
}

const validOS = async () => {
  try {
    const contents = await fs.readFile(releaseFile, 'utf8')

    if (contents.indexOf('UBUNTU_CODENAME=focal') !== -1) {
      console.log('Ubuntu Focal is no longer supported')
      process.exit(1)
    }

    if (contents.indexOf('UBUNTU_CODENAME=jammy') !== -1) {
      return true
    }

    if (contents.indexOf('UBUNTU_CODENAME=noble') !== -1) {
      return true
    }

    throw new Error('Invalid OS or unable to determine Ubuntu version')
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      throw new Error('invalid OS, missing ${releaseFile}')
    }

    throw err
  }
}

const checkOptions = () => {
  if (cli['--mode'] != null) {
    if (validModes.indexOf(cli['--mode']) === -1) {
      throw new Error(`${cli['--mode']} is not a valid install mode. Valid modes are: ${validModes.join(', ')}`)
    }
    else {
      isModeSpecified = true
    }
  }
}

const fileExists = async (path) => {
  try {
    await fs.stat(path)
    return true
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false
    }
    throw err
  }
}

const saltCheckVersion = async (path, value) => {
  try {
    const contents = await fs.readFile(path, 'utf8')
    return contents.indexOf(value) === 0
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false
    }
    throw err
  }
}

const setupSalt = async () => {
  if (cli['--dev'] === false) {
    const aptSourceList = '/etc/apt/sources.list.d/saltstack.list'
    const aptDebString = `deb [signed-by=/usr/share/keyrings/salt-archive-keyring.pgp, arch=amd64] https://packages.broadcom.com/artifactory/saltproject-deb/ stable main`

    const aptExists = await fileExists(aptSourceList)
    const saltExists = await fileExists('/usr/bin/salt-call')
    const saltVersionOk = await saltCheckVersion(aptSourceList, aptDebString)

    if (aptExists === true && saltVersionOk === false) {
      console.log('NOTICE: Fixing incorrect SaltStack version configuration.')
      console.log('Installing and configuring SaltStack...')
      await execAsync('apt-get remove -y --allow-change-held-packages salt-minion salt-common')
      await fs.writeFile(aptSourceList, aptDebString)
      await execAsync(`wget -O /usr/share/keyrings/salt-archive-keyring.pgp https://packages.broadcom.com/artifactory/api/security/keypair/SaltProjectKey/public`)
      await execAsync(`printf 'Package: salt-*\nPin: version ${saltstackVersion}.*\nPin-Priority: 1001' > /etc/apt/preferences.d/salt-pin-1001`)
      await execAsync('apt-get update')
      await execAsync('apt-get install -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" -y --allow-change-held-packages salt-common', {
        env: {
          ...process.env,
          DEBIAN_FRONTEND: 'noninteractive',
        },
      })
    } else if (aptExists === false || saltExists === false) {
      console.log('Installing and configuring SaltStack...')
      await fs.writeFile(aptSourceList, aptDebString)
      await execAsync(`wget -O /usr/share/keyrings/salt-archive-keyring.pgp https://packages.broadcom.com/artifactory/api/security/keypair/SaltProjectKey/public`)
      await execAsync(`printf 'Package: salt-*\nPin: version ${saltstackVersion}.*\nPin-Priority: 1001' > /etc/apt/preferences.d/salt-pin-1001`)
      await execAsync('apt-get update')
      await execAsync('apt-get install -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" -y --allow-change-held-packages salt-common', {
        env: {
          ...process.env,
          DEBIAN_FRONTEND: 'noninteractive',
        },
      })
    }
  } else {
    return Promise.resolve();
  }
}

const getCurrentVersion = async () => {
  try {
    const contents = await fs.readFile(versionFile)
    return contents.toString().replace(/\n/g, '')
  } catch (err) {
    if (err.code === 'ENOENT') {
      return 'not installed'
    }
    throw err
  }
}

const listReleases = () => {
  return github.repos.listReleases({
    owner: 'bitcurator',
    repo: 'bitcurator-salt'
  })
}

const getValidReleases = async () => {
  const currentRelease = await getCurrentVersion()
  let releases = await listReleases()
  const realReleases = releases.data.filter(release => !release.prerelease).map(release => release.tag_name)
  const allReleases = releases.data.map(release => release.tag_name)

  if (currentRelease === 'not installed') {
    if (cli['--pre-release'] === true) {
      return allReleases
    }
    return realReleases
  }

  let curIndex = allReleases.indexOf(currentRelease)
  if (curIndex === 0) {
    return [allReleases[0]]
  }

  if (cli['--pre-release'] === true) {
    return allReleases.slice(0, curIndex)
  }

  return allReleases.slice(0, curIndex).filter((release) => {
    return realReleases.indexOf(release) !== -1
  })
}

const getLatestRelease = async () => {
  const releases = await getValidReleases()
  return releases[0]
}

const isValidRelease = async (version) => {
  const releases = await getValidReleases()
  return releases.indexOf(version) !== -1
}

const validateVersion = async (version) => {
  const releases = await getValidReleases()
  if (releases.indexOf(version) === -1) {
    throw new Error('The version you are attempting to install/upgrade to is not valid.')
  }
}

const downloadReleaseFile = async (version, filename) => {
  console.log(`> downloading ${filename}`)

  const filepath = `${cachePath}/${version}/${filename}`
  const url = `https://github.com/bitcurator/bitcurator-salt/releases/download/${version}/${filename}`
  if (fsSync.existsSync(filepath) && cli['--no-cache'] === false) {
    return Promise.resolve()
  }
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const output = fsSync.createWriteStream(filepath)
  return new Promise((resolve, reject) => {
    const reader = response.body.getReader()
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          output.write(value)
        }
        output.end()
      } catch (err) {
        output.destroy()
        reject(err)
      }
    }
    output.on('error', (err) => {
      reject(err)
    })
    output.on('finish', () => {
      resolve()
    })
    pump()
  })
}

const downloadRelease = async (version) => {
  console.log(`> downloading bitcurator-salt-${version}.tar.gz`)
  const filepath = `${cachePath}/${version}/bitcurator-salt-${version}.tar.gz`
  if (fsSync.existsSync(filepath) && cli['--no-cache'] === false) {
    return Promise.resolve()
  }
  const response = await fetch(`https://github.com/bitcurator/bitcurator-salt/archive/${version}.tar.gz`)
  if (!response.ok) {
    throw new Error(`fetch error - status: ${response.status}`)
  }
  const output = fsSync.createWriteStream(filepath)
  const reader = response.body.getReader()
  return new Promise((resolve, reject) => {
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          output.write(value)
        }
        output.end()
        resolve()
      } catch (err) {
        output.destroy()
        reject(err)
      }
    }

    output.on('error', reject)
    pump()
  })
}

const validateFile = async (version, filename) => {
  console.log(`> validating file ${filename}`)
  const expected = await fs.readFile(`${cachePath}/${version}/${filename}.sha256`)
  const actual = await new Promise((resolve, reject) => {
    const shasum = crypto.createHash('sha256')
    fsSync.createReadStream(`${cachePath}/${version}/${filename}`)
      .on('error', (err) => {
        reject(err)
      })
      .on('data', (data) => {
        shasum.update(data)
      })
      .on('close', () => {
        resolve(`${shasum.digest('hex')}  /tmp/${filename}\n`)
      })
  })
  if (expected.toString() !== actual) {
    throw new Error(`Hashes for ${filename} do not match. Expected: ${expected}. Actual: ${actual}.`)
  }
}

const validateSignature = async (version, filename) => {
  console.log(`> validating signature for ${filename}`)

  const filepath = `${cachePath}/${version}/${filename}`
  const ctSignature = await fs.readFile(`${filepath}.asc`, 'utf8')
  const ctPubKey = pubKey
  const publicKey = await openpgp.readKey({ armoredKey: ctPubKey })
  const cleartextMessage = await openpgp.readCleartextMessage({ cleartextMessage: ctSignature })
  const valid = await openpgp.verify({
    message: cleartextMessage,
    verificationKeys: publicKey
  });

  if (!valid.signatures || valid.signatures.length === 0) {
    throw new Error('Invalid Signature')
  }

  const isValid = await valid.signatures[0].verified
  if (!isValid) {
    throw new Error('PGP Signature is not valid')
  }
}

const extractUpdate = (version, filename) => {
  const filepath = `${cachePath}/${version}/${filename}`

  return new Promise((resolve, reject) => {
    console.log(`> extracting update ${filename}`)

    let stdout = ''
    let stderr = ''
    const extract = spawn('tar', ['-z', '-x', '-f', filepath, '-C', `${cachePath}/${version}`])
    extract.stdout.on('data', (data) => {
      stdout = `${stdout}${data}`
      console.log(data.toString())
    })
    extract.stderr.on('data', (data) => {
      stderr = `${stderr}${data}`
      console.log(data.toString())
    })
    extract.on('error', (err) => {
      reject(err)
    })
    extract.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error('Extraction returned exit code not zero'))
      }

      resolve()
    })
  })
}

const downloadUpdate = async (version) => {
  console.log(`> downloading ${version}`)
  await mkdirp(`${cachePath}/${version}`)
  await downloadReleaseFile(version, `bitcurator-salt-${version}.tar.gz.asc`)
  await downloadReleaseFile(version, `bitcurator-salt-${version}.tar.gz.sha256`)
  await downloadReleaseFile(version, `bitcurator-salt-${version}.tar.gz.sha256.asc`)
  await downloadRelease(version)
  await validateFile(version, `bitcurator-salt-${version}.tar.gz`)
  await validateSignature(version, `bitcurator-salt-${version}.tar.gz.sha256`)
  await extractUpdate(version, `bitcurator-salt-${version}.tar.gz`)
}

const performUpdate = (version) => {
  const filepath = `${cachePath}/${version}/bitcurator-salt-${version.replace('v', '')}`
  const outputFilepath = `${cachePath}/${version}/results.yml`
  const logFilepath = `${cachePath}/${version}/saltstack.log`
  cfg.logPath = logFilepath
  const begRegex = /Running state \[(.*)\] at time (.*)/g
  const endRegex = /Completed state \[(.*)\] at time (.*) duration_in_ms=(.*)/g

  const stateApplyMap = {
    'dedicated': 'bitcurator.dedicated',
    'addon': 'bitcurator.addon'
  }

  if (!isModeSpecified) {
    let savedMode = bitcuratorConfiguration['mode']
    if (validModes.indexOf(savedMode) != -1) {
      cli['--mode'] = savedMode
	    console.log(`> using previous mode: ${cli['--mode']}`)
    }  else {
      console.log(`> no previous bitcurator version found; performing a new 'dedicated' installation.`)
      cli['--mode'] = "dedicated"
    }
  }

  return new Promise((resolve, reject) => {
    console.log(`> upgrading/updating to ${version}`)
    console.log(`> Log file: ${logFilepath}`)

    if (os.platform() !== 'linux') {
      console.log(`>>> Platform is not Linux`)
      return process.exit(1)
    }

    let stderr = ''

    const logFile = fsSync.createWriteStream(logFilepath)

    const updateArgs = [
      '-l', 'debug', '--local',
      '--file-root', filepath,
      '--state-output=terse',
      '--out=yaml',
      'state.apply', stateApplyMap[cli['--mode']],
      `pillar={bitcurator_user: "${bitcuratorConfiguration['user']}"}`
    ]

    const update = spawn('salt-call', updateArgs)

    update.stdout.pipe(fsSync.createWriteStream(outputFilepath))
    update.stdout.pipe(logFile)
    update.stderr.pipe(logFile)
    update.stderr
      .pipe(split())
      .on('data', (data) => {
        stderr = `${stderr}${data}`

        const begMatch = begRegex.exec(data)
        const endMatch = endRegex.exec(data)

        if (begMatch !== null) {
          process.stdout.write(`\n> Running: ${begMatch[1]}\r`)
        } else if (endMatch !== null) {
          let message = `> Completed: ${endMatch[1]} (Took: ${endMatch[3]} ms)`
          if (process.stdout.isTTY === true) {
            readline.clearLine(process.stdout, 0)
            readline.cursorTo(process.stdout, 0)
          }
          process.stdout.write(`${message}`)
        }
      })
    update.on('error', (err) => {
      console.log(arguments)
      reject(err)
    })
    update.on('close', (code) => {
      if (code !== 0) {
        return summarizeResults(version)
          .then(() => {
            reject(new Error(`Update returned non-zero exit code (${code})`));
          })
          .catch((err) => {
            console.log('Failed to summarize results:', err);
            reject(new Error(`Update returned non-zero exit code (${code}) and summary failed`));
          });
      }
      process.nextTick(resolve)
    })
  })
}

const summarizeResults = async (version) => {
  const outputFilepath = `${cachePath}/${version}/results.yml`
  if (await fileExists(outputFilepath)) {
    const rawContents = await fs.readFile(outputFilepath, 'utf8')
    let results = {}

    results = yaml.load(rawContents)

    let success = 0
    let failure = 0
    let failures = [];
    Object.keys(results['local']).forEach((key) => {
      if (results['local'][key]['result'] === true) {
        success++
      } else {
        failure++
        failures.push(results['local'][key])
      }
    })

    if (failure > 0) {
      console.log(`\n> Incomplete due to failures -- Success: ${success}, Failure: ${failure}`)
      console.log(`\r>>>> List of Failures (first 10 only)`)
      console.log(`\r     NOTE: First failure is generally the root cause.`)
      console.log(`\n     IMPORTANT: If seeking assistance, include this information,`)
      console.log(`\r     AND the /var/cache/bitcurator/cli/${version}/saltstack.log.\n`)
      failures.sort((a, b) => {
        return a['__run_num__'] - b['__run_num__']
      }).slice(0, 10).forEach((key) => {
        console.log(`      - ID: ${key['__id__']}`)
        console.log(`        SLS: ${key['__sls__']}`)
        console.log(`        Run#: ${key['__run_num__']}`)
        console.log(`        Comment: ${key['comment']}`)
      })
      console.log('\r')

      return Promise.resolve()
    }

    console.log(`\n>> COMPLETED SUCCESSFULLY! Success: ${success}, Failure: ${failure}`)
    console.log(`\n>> Please reboot to make sure all settings take effect.`)
  } else {
    console.log(`The file ${outputFilepath} does not exist!\nIf using the "results" option make sure you specify the version with --version.`)
    process.exit(1)
  }
}

const saveConfiguration = (version) => {
  const config = {
    version: version,
    mode: cli['--mode'],
    user: cli['--user']
  }

  return fs.writeFile(configFile, yaml.dump(config))
}

const loadConfiguration = async () => {
  try {
    const contents = await fs.readFile(configFile, 'utf8')
    return yaml.load(contents)
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        mode: 'unknown',
        user: cli['--user']
      }
    }
    throw err
  }
}

const run = async () => {
  if (cli['-v'] === true) {
    console.log(`Version: ${cfg.version}`)
    return process.exit(0)
  }

  console.log(`> bitcurator-cli@${cfg.version}`)

  if (cli['debug'] === true) {
    const config = await loadConfiguration()

    const debug = `
Version: ${cfg.version}
User: ${currentUser}
Log Path: ${cfg.logPath}
Config:
${yaml.dump(config)}
`
    console.log(debug)
    return process.exit(0)
  }

  if (currentUser === 'root') {
    console.log('Warning: You are running as root.')
    if (currentUser === cli['--user']) {
      console.log('Error: You cannot install as root without specifying the --user option.')
      console.log()
      console.log('The install user specified with --user must not be the root user.')
      return process.exit(5)
    }
  }

  checkOptions()

  await validOS()

  await setup()

  bitcuratorConfiguration = await loadConfiguration()

  const version = await getCurrentVersion()
  console.log(`> bitcurator-version: ${version}\r`)

  if (isModeSpecified) {
    console.log(`> mode: ${cli['--mode']}`)
  }

  if (cli['version'] === true) {
    return process.exit(0)
  }

  if (cli['list-upgrades'] === true) {
    const releases = await getValidReleases()
    const current = await getCurrentVersion()
    if (releases.length === 0 || releases[0] === current) {
      console.log('No upgrades available.')
      return process.exit(0)
    }

    console.log('> List of available releases')
    releases.forEach(release => console.log(`  - ${release}`))
    return process.exit(0)
  }

  if (!process.env.SUDO_USER && cli['--dev'] === false) {
    console.log('> Error! You must be root to execute this.')
    return process.exit(1)
  }

  await setupSalt()
  if (cli['results'] === true && cli['--version'] !== null) {
    await summarizeResults(cli['--version'])
  }
  if (cli['install'] === true) {
    const currentVersion = await getCurrentVersion(versionFile)

    if (currentVersion !== 'not installed') {
      console.log('bitcurator is already installed, please use the "upgrade" command.')
      return process.exit(0)
    }

    let versionToInstall = null
    if (cli['--version'] === 'latest') {
      versionToInstall = await getLatestRelease()
    } else {
      const validRelease = await isValidRelease(cli['--version'])

      if (validRelease === false) {
        console.log(`${cli['--version']} is not a bitcurator valid release.`)
        return process.exit(5)
      }

      versionToInstall = cli['--version']
    }

    if (versionToInstall === null) {
      throw new Error('versionToInstall was null, this should never happen.')
    }

    await validateVersion(versionToInstall)
    await downloadUpdate(versionToInstall)
    await performUpdate(versionToInstall)
    await summarizeResults(versionToInstall)
    await saveConfiguration(versionToInstall)
  }

  if (cli['upgrade'] === true) {
    const release = await getLatestRelease()
    const current = await getCurrentVersion()

    if (release === current || typeof release === 'undefined') {
      console.log('No upgrades available')
      process.exit(0)
    }

    await downloadUpdate(release)
    await performUpdate(release)
    await summarizeResults(release)
  }
}

const main = async () => {
  try {
    await run()
  } catch (err) {
    error(err)
  }
}

main()
