const Compute = require('@google-cloud/compute');
const Resource = require('@google-cloud/resource');

const gce = new Compute({
  projectId: 'pts-tools'
});

const resource = new Resource({});

resource.getProjects()
  .then(results => {
    const projects = results[0];
    console.log(JSON.stringify(results, null, 2));
  });
/*
gce.getZones(function(err, zones) {
  for(let i = 0; i < zones.length; i++) {
    console.log(zones[i].name);
  };
});
*/

/*
gce.getVMs({
}, function(err, vms) {
  console.log(JSON.stringify(vms, null, 2));
});
*/

//gce.getVMs({
//    maxResults: 100,
//    filter: 'name eq ^ud.*$'
//}, function(err, vms) {
//  console.log(vms);
//});

/*
gce.getDisks().then(function(data) {
  var disks = data[0];
  console.log(JSON.stringify(disks, null, 2));
});
*/

/*
gce.getSnapshots({
  maxResults: 10,
  orderBy: 'creationTimestamp desc'
}, function(err, snapshots) {
  console.log(snapshots);
});
*/

/*
gce.getSnapshots({
  maxResults: 10,
  orderBy: 'creationTimestamp desc'})
.then(function(data) {
  const snapshots = data[0];
  console.log(JSON.stringify(snapshot, null, 2));
});
*/
    
/*
gce.getFirewalls({
}, function(err, firewalls) {
  console.log(JSON.stringify(firewalls, null, 2));
});
*/
