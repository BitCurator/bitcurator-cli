const cfg = require('./config.json')
const bluebird = require('bluebird')
const os = require('os')
const fs = bluebird.promisifyAll(require('fs'))
const child_process = bluebird.promisifyAll(require('child_process'))
const crypto = require('crypto')
const spawn = require('child_process').spawn
const docopt = require('docopt').docopt
const { Octokit } = require('@octokit/rest')
const mkdirp = require('mkdirp')
const request = require('request')
const openpgp = require('openpgp')
const username = require('username')
const readline = require('readline')
const split = require('split')
const semver = require('semver')

/**
 * Setup Custom YAML Parsing
 */
const yaml = require('js-yaml')
const PythonUnicodeType = new yaml.Type('tag:yaml.org,2002:python/unicode', {
  kind: 'scalar',
  construct: (data) => { return data !== null ? data : ''; }
})
const PYTHON_SCHEMA = new yaml.Schema({
  include: [yaml.DEFAULT_SAFE_SCHEMA],
  explicit: [PythonUnicodeType]
})

const currentUser = process.env.SUDO_USER || username.sync()

const doc = `
Usage:
  bitcurator [options] list-upgrades [--pre-release]
  bitcurator [options] install [--pre-release] [--version=<version>] [--mode=<mode>] [--user=<user>]
  bitcurator [options] update
  bitcurator [options] upgrade [--pre-release] [--mode=<mode>] [--user=<user>]
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

const saltstackVersion = '3007'
const pubKey = `
Version: GnuPG

-----BEGIN PGP PUBLIC KEY BLOCK-----

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
NPeomXepvesHWoZRm6rNus5cKVt7V2A4
=9mn9
-----END PGP PUBLIC KEY BLOCK-----
`

const help = `

Try rebooting your system and trying the operation again.

Sometimes problems occur due to network or server issues when
downloading packages, in which case retrying your operation
a bit later might lead to good results.
Additionally, if you are operating behind a proxy, you may
need to configure your environment to allow access through
the proxy.

To determine the nature of the issue, please review the
saltstack.log file under /var/cache/bitcurator/cli/ in the
subdirectory that matches the bitcurator version you're installing.
Pay particular attention to lines that start with [ERROR], or
which come before the line "result: false".

`

let osVersion = null
let osCodename = null
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
  console.log(help)
  process.exit(1)
}

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
    const contents = fs.readFileSync(releaseFile, 'utf8')

    if (contents.indexOf('UBUNTU_CODENAME=focal') !== -1) {
      osVersion = '20.04'
      osCodename = 'focal'
      return true
    }

    if (contents.indexOf('UBUNTU_CODENAME=jammy') !== -1) {
      osVersion = '22.04'
      osCodename = 'jammy'
      return true
    }

    if (contents.indexOf('UBUNTU_CODENAME=noble') !== -1) {
      osVersion = '24.04'
      osCodename = 'noble'
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

const fileExists = (path) => {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err && err.code === 'ENOENT') {
        return resolve(false)
      }

      if (err) {
        return reject(err)
      }

      return resolve(true)
    })
  })
}

const saltCheckVersion = (path, value) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, contents) => {
      if (err && err.code === 'ENOENT') {
        return resolve(false);
      }

      if (err) {
        return reject(err);
      }

      if (contents.indexOf(value) === 0) {
        return resolve(true);
      }

      return resolve(false);
    })
  })
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
      await child_process.execAsync('apt-get remove -y --allow-change-held-packages salt-minion salt-common')
      await fs.writeFileAsync(aptSourceList, aptDebString)
      await child_process.execAsync(`wget -O /usr/share/keyrings/salt-archive-keyring.pgp https://packages.broadcom.com/artifactory/api/security/keypair/SaltProjectKey/public`)
      await child_process.execAsync(`printf 'Package: salt-*\nPin: version ${saltstackVersion}.*\nPin-Priority: 1001' > /etc/apt/preferences.d/salt-pin-1001`)
      await child_process.execAsync('apt-get update')
      await child_process.execAsync('apt-get install -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" -y --allow-change-held-packages salt-common', {
        env: {
          ...process.env,
          DEBIAN_FRONTEND: 'noninteractive',
        },
      })
    } else if (aptExists === false || saltExists === false) {
      console.log('Installing and configuring SaltStack...')
      await fs.writeFileAsync(aptSourceList, aptDebString)
      await child_process.execAsync(`wget -O /usr/share/keyrings/salt-archive-keyring.pgp https://packages.broadcom.com/artifactory/api/security/keypair/SaltProjectKey/public`)
      await child_process.execAsync(`printf 'Package: salt-*\nPin: version ${saltstackVersion}.*\nPin-Priority: 1001' > /etc/apt/preferences.d/salt-pin-1001`)
      await child_process.execAsync('apt-get update')
      await child_process.execAsync('apt-get install -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" -y --allow-change-held-packages salt-common', {
        env: {
          ...process.env,
          DEBIAN_FRONTEND: 'noninteractive',
        },
      })
    }
  } else {
    return new Promise((resolve, reject) => {
      resolve()
    })
  }
}

const getCurrentVersion = () => {
  return fs.readFileAsync(versionFile)
    .catch((err) => {
      if (err.code === 'ENOENT') return 'notinstalled'
      if (err) throw err
    })
    .then(contents => contents.toString().replace(/\n/g, ''))
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
  const realReleases = releases.data.filter(release => !Boolean(release.prerelease)).map(release => release.tag_name)
  const allReleases = releases.data.map(release => release.tag_name)

  if (currentRelease === 'notinstalled') {
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

const getLatestRelease = () => {
  return getValidReleases().then(releases => releases[0])
}

const isValidRelease = (version) => {
  return getValidReleases().then((releases) => {
    return new Promise((resolve, reject) => {
      if (releases.indexOf(version) === -1) {
        return resolve(false)
      }
      resolve(true)
    })
  })
}

const validateVersion = (version) => {
  return getValidReleases().then((releases) => {
    if (typeof releases.indexOf(version) === -1) {
      throw new Error('The version you are attempting to install/upgrade to is not valid.')
    }
    return new Promise((resolve) => { resolve() })
  })
}

const downloadReleaseFile = (version, filename) => {
  console.log(`>> downloading ${filename}`)

  const filepath = `${cachePath}/${version}/${filename}`

  if (fs.existsSync(filepath) && cli['--no-cache'] === false) {
    return new Promise((resolve) => { resolve() })
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(filepath)
    const req = request.get(`https://github.com/bitcurator/bitcurator-salt/releases/download/${version}/${filename}`)
    req.on('error', (err) => {
      reject(err)
    })
    req
      .on('response', (res) => {
        if (res.statusCode !== 200) {
          throw new Error(res.body)
        }
      })
      .pipe(output)
      .on('error', (err) => {
        reject(err)
      })
      .on('close', resolve)
  })
}

const downloadRelease = (version) => {
  console.log(`>> downloading bitcurator-salt-${version}.tar.gz`)

  const filepath = `${cachePath}/${version}/bitcurator-salt-${version}.tar.gz`

  if (fs.existsSync(filepath) && cli['--no-cache'] === false) {
    return new Promise((resolve, reject) => { resolve() })
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(filepath)
    const req = request.get(`https://github.com/bitcurator/bitcurator-salt/archive/${version}.tar.gz`)
    req.on('error', (err) => {
      reject(err)
    })
    req
      .pipe(output)
      .on('error', (err) => {
        reject(err)
      })
      .on('close', resolve)
  })
}

const validateFile = async (version, filename) => {
  console.log(`> validating file ${filename}`)
  const expected = await fs.readFileAsync(`${cachePath}/${version}/${filename}.sha256`)

  const actual = await new Promise((resolve, reject) => {
    const shasum = crypto.createHash('sha256')
    fs.createReadStream(`${cachePath}/${version}/${filename}`)
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

  const ctMessage = await fs.readFileAsync(`${filepath}`, 'utf8')
  const ctSignature = await fs.readFileAsync(`${filepath}.asc`, 'utf8')
  const ctPubKey = pubKey

  const options = {
    message: await openpgp.cleartext.readArmored(ctSignature),
    publicKeys: (await openpgp.key.readArmored(ctPubKey)).keys
  }

  const valid = await openpgp.verify(options)

  if (typeof valid.signatures === 'undefined' && typeof valid.signatures[0] === 'undefined') {
    throw new Error('Invalid Signature')
  }

  if (valid.signatures[0].valid === false) {
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

    console.log(`>> Log file: ${logFilepath}`)

    if (os.platform() !== 'linux') {
      console.log(`>>> Platform is not Linux`)
      return process.exit(0)
    }

    let stdout = ''
    let stderr = ''

    const logFile = fs.createWriteStream(logFilepath)

    const updateArgs = [
      '-l', 'debug', '--local',
      '--file-root', filepath,
      '--state-output=terse',
      '--out=yaml',
      'state.apply', stateApplyMap[cli['--mode']],
      `pillar={bitcurator_user: "${bitcuratorConfiguration['user']}"}`
    ]

    const update = spawn('salt-call', updateArgs)

    update.stdout.pipe(fs.createWriteStream(outputFilepath))
    update.stdout.pipe(logFile)

    update.stderr.pipe(logFile)
    update.stderr
      .pipe(split())
      .on('data', (data) => {
        stderr = `${stderr}${data}`

        const begMatch = begRegex.exec(data)
        const endMatch = endRegex.exec(data)

        if (begMatch !== null) {
          process.stdout.write(`\n>> Running: ${begMatch[1]}\r`)
        } else if (endMatch !== null) {
          let message = `>> Completed: ${endMatch[1]} (Took: ${endMatch[3]} ms)`
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
        return reject(new Error('Update returned non-zero exit code'))
      }

      process.nextTick(resolve)
    })
  })
}

const summarizeResults = async (version) => {
  const outputFilepath = `${cachePath}/${version}/results.yml`
  const rawContents = await fs.readFileAsync(outputFilepath)
  let results = {}

  try {
    results = yaml.safeLoad(rawContents, { schema: PYTHON_SCHEMA })
  } catch (err) {
    // TODO handle?
  }

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
    console.log(`\n\n>> Incomplete due to Failures -- Success: ${success}, Failure: ${failure}`)
    console.log(`\n>>>> List of Failures (first 10 only)`)
    console.log(`\n     NOTE: First failure is generally the root cause.`)
    console.log(`\n     IMPORTANT: If seeking assistance, include this information,\n`)
    console.log(`\n     AND the /var/cache/bitcurator/cli/${version}/saltstack.log.\n`)
    failures.sort((a, b) => {
      return a['__run_num__'] - b['__run_num__']
    }).slice(0, 10).forEach((key) => {
      console.log(`      - ID: ${key['__id__']}`)
      console.log(`        SLS: ${key['__sls__']}`)
      console.log(`        Run#: ${key['__run_num__']}`)
      console.log(`        Comment: ${key['comment']}`)
    })

    return new Promise((resolve, reject) => { return resolve() })
  }

  console.log(`\n\n>> COMPLETED SUCCESSFULLY! Success: ${success}, Failure: ${failure}`)
  console.log(`\n\n>> Please reboot to make sure all settings take effect.`)
}

const saveConfiguration = (version) => {
  const config = {
    version: version,
    mode: cli['--mode'],
    user: cli['--user']
  }

  return fs.writeFileAsync(configFile, yaml.safeDump(config))
}

const loadConfiguration = async () => {
  try {
    return await fs.readFileAsync(configFile).then((c) => yaml.safeLoad(c))
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

Config:
${yaml.safeDump(config)}
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
  console.log(`> bitcurator-version: ${version}\n`)

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

  if (cli['update'] === true) {
    if (version === 'notinstalled') {
      throw new Error('bitcurator is not installed, unable to update.')
    }

    await downloadUpdate(version)
    await performUpdate(version)
    await summarizeResults(version)
  }

  if (cli['install'] === true) {
    const currentVersion = await getCurrentVersion(versionFile)

    if (currentVersion !== 'notinstalled') {
      console.log('bitcurator is already installed, please use the \"update\" or \"upgrade\" command.')
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
