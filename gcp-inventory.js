// Imports the Google Cloud client libraries
const Resource = require('@google-cloud/resource');
const Compute = require('@google-cloud/compute');
const Storage = require('@google-cloud/storage');

// Imports other libraries
const fs = require('fs');
const getenv = require('getenv');
const email = require("emailjs");

// Imports environment variables
const TMP_DIR = getenv('TMP_DIR');
const GCP_BUCKET = getenv('GCP_BUCKET');
const SMTP_USER = getenv('SMTP_USER');
const SMTP_PASSWORD = getenv('SMTP_PASSWORD');
const SMTP_HOST = getenv('SMTP_HOST');
const SMTP_PORT = getenv('SMTP_PORT');
const SMTP_FROM = getenv('SMTP_FROM');
const SMTP_TO = getenv('SMTP_TO');

// Creates output write stream 
const csvFileName = 'gcp-inventory-' + new Date().toISOString() + '.csv'; 
const tmpCsv = TMP_DIR + '/' + csvFileName;
const writer = fs.createWriteStream(tmpCsv);

// Creates clients
const resourceClient = new Resource({});
const storage = new Storage();

// Runs the audit
(async function runAudit() {
  writer.write('GCP INVENTORY\n');
  const projects = await getProjects();
  await listVMs(projects);
  await listDisks(projects);
  await listSnapshots(projects);
  await listFirewalls(projects); 
  await uploadFileToBucket();
  sendFileByEmail()
})();

// Lists current projects
function getProjects() {
  return resourceClient
    .getProjects()
    .then(results => {
      const projects = results[0];
      //console.log(JSON.stringify(projects, null, 2));
      return projects;
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

// List VMs for projects
function listVMs(projects) {
  const vmPromises = [];
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i].metadata;
    const projectId = project.projectId;
    const projectStatus = project.lifecycleState;
    const gce = new Compute({
      projectId: projectId
    });
    const vmPromise = gce.getVMs({
    }).then(function(data) {
      const vms = data[0];
      if(vms) {
	for(let i = 0; i < vms.length; i++) {
	  const vm = vms[i].metadata;
	  const vmName = vm.name;
	  const zone = vm.zone.split('/').pop();
	  const vmMachineType = vm.machineType;
	  // ASSUMPTION: Only one network interface
	  const networkInterface = vm.networkInterfaces[0];
	  const vnInternalIP = networkInterface.networkIP;
	  const vmExternalIP = networkInterface.accessConfigs[0].natIP;
	  const vmStatus = vm.status;
	  if(!listVMs.vmHeaderPrinted) {
	    writer.write(',\n');
	    writer.write('VMs\n');
	    writer.write('projectId,projectStatus,vmName,zone,vmMachineType,vnInternalIP,vmExternalIP,vmStatus\n');
	    listVMs.vmHeaderPrinted = true;
	  }

	  writer.write(projectId + ',' + projectStatus + ',' + vmName + ',' + zone + ',' + vmMachineType + ',' + vnInternalIP + ',' + vmExternalIP + ',' + vmStatus + '\n');
	}
      }
    }).catch((e) => {
      // generate audit even if some APIs are not available for certain projects
    });
    vmPromises.push(vmPromise);
  }
  return Promise.all(vmPromises);
}

function listDisks(projects) {
  const diskPromises = [];
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i].metadata;
    const projectId = project.projectId;
    const gce = new Compute({
      projectId: projectId
    });
    const diskPromise = gce.getDisks({
    }).then(function(data) {
      const disks = data[0];
      if(disks) {
	for(let i = 0; i < disks.length; i++) {
	  const disk = disks[i].metadata;
	  const diskName = disk.name;
	  const zone = disk.zone.split('/').pop();
	  const diskSize = disk.sizeGb;
	  const diskType = disk.type.split('/').pop();
	  const diskStatus = disk.status;
	  if(!listDisks.disksHeaderPrinted) {
	    writer.write(',\n');
	    writer.write('DISKS\n');
	    writer.write('projectId,diskName,zone,diskSize,diskType,diskStatus\n');
	    listDisks.disksHeaderPrinted = true;
	  }

	  writer.write(projectId + ',' + diskName + ',' + zone + ',' + diskSize + ',' + diskType + ',' + diskStatus + '\n');
	}
      }
    }).catch((e) => {
      // generate audit even if some APIs are not available for certain projects
    });
    diskPromises.push(diskPromise);
  }
  return Promise.all(diskPromises);
}

function listSnapshots(projects) {
  const snapshotPromises = [];
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i].metadata;
    const projectId = project.projectId;
    const gce = new Compute({
      projectId: projectId
    });
    const snapshotPromise = gce.getSnapshots({
      maxResults: 10,
      orderBy: 'creationTimestamp desc'
    }).then(function(data) {
      const snapshots = data[0];
      if(snapshots) {
	for(let i = 0; i < snapshots.length; i++) {
	  const snapshot = snapshots[i].metadata;
	  if(!listSnapshots.snapshotsHeaderPrinted) {
	    writer.write(',\n');
	    writer.write('SNAPSHOTS\n');
	    writer.write('projectId,snapshotName,snapshotCreationTimestamp,snapshotDiskSizeGb,snapshotStatus\n');
	    listSnapshots.snapshotsHeaderPrinted = true;
	  }
	  writer.write(projectId + ',' + snapshot.name + ',' + snapshot.creationTimestamp + ',' + snapshot.diskSizeGb + ',' + snapshot.status + '\n');
	}
      }
    }).catch((e) => {
      // generate audit even if some APIs are not available for certain projects
    });
    snapshotPromises.push(snapshotPromise);
  }
  return Promise.all(snapshotPromises);
}

function listFirewalls(projects) {
  const firewallPromises = [];
  for(let i = 0; i < projects.length; i++) {
    const project = projects[i].metadata;
    const projectId = project.projectId;
    const gce = new Compute({
      projectId: projectId
    });
    const firewallPromise = gce.getFirewalls({
      }).then(function(data) {
      const firewalls = data[0];
      if(firewalls) {
	for(let i = 0; i < firewalls.length; i++) {
	  const firewall = firewalls[i].metadata;
	  const firewallNetwork = firewall.network.split('/').pop();
	  let firewallAllow = '';
	  const allowed = firewall.allowed;
	  for(let i = 0; i < allowed.length; i++) {
	    if(i > 0) {
	      firewallAllow += ';';
	    }
	    const ipProtocol = allowed[i].IPProtocol
	    const ports = allowed[i].ports;
	    if(ports) {
	      for(let i = 0; ports && i < ports.length; i++) {
		if(i > 0) {
		  firewallAllow += ';';
		}
		firewallAllow += ipProtocol + ':' + ports[i]
	      }
	    } else {
		firewallAllow += allowed[i].IPProtocol;
	    }
	  }
	  if(!listFirewalls.firewallsHeaderPrinted) {
	    writer.write(',\n');
	    writer.write('FIREWALL RULES\n');
	    writer.write('projectId,firewallName,firewallNetwork,firewallDirection,firewallPriority,firewallAllow\n');
	    listFirewalls.firewallsHeaderPrinted = true;
	  }
	  writer.write(projectId + ',' + firewall.name + ',' + firewallNetwork + ',' + firewall.direction + ',' + firewall.priority + ',' + firewallAllow + '\n');
	}
      }
    }).catch((e) => {
      // generate audir even if some APIs are not available for certain projects
    });
    firewallPromises.push(firewallPromise);
  }
  return Promise.all(firewallPromises);
}


// Uploads a local file to a bucket
function uploadFileToBucket() {
  storagePromise = storage
    .bucket(GCP_BUCKET)
    .upload(tmpCsv)
    .then(() => {
      console.log(`${tmpCsv} uploaded to ${GCP_BUCKET}.`);
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
  return storagePromise;
}

// Emails a local file
function sendFileByEmail() {
  const server = email.server.connect({
    user: SMTP_USER, 
    password: SMTP_PASSWORD, 
    host: SMTP_HOST,
    port: SMTP_PORT, 
    ssl: false,
    tls: false,
  });  
  const message	= {
    text: "GCP Inventory", 
    from: SMTP_FROM, 
    to: SMTP_TO,
    subject: "GCP Inventory",
    attachment: [
      {path: tmpCsv, type: 'text/csv', name:csvFileName}
    ]
  };
  server.send(message, function(err, message) { if(err) console.log(err); });
  console.log(`${tmpCsv} sent to ${SMTP_TO}.`);
}
