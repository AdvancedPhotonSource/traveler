# Breaking Changes

Mongodb has been upgraded to version 8. This requires data migration and support rebuild. Node.js has also been upgraded to version 20.

## Steps

### Preperation

```sh
cd traveler/traveler-1.7.0-dist
source setup.sh

./etc/init.d/traveler-webapp stop
make db-backup
```

### Upgrade

```sh
cd traveler/traveler-1.8.0-dist
source setup.sh

make support
mv -v ../data/mongodb ../data/mongodb-`date +%Y%m%d_%H%M%S`

make prep-mongo
./etc/init.d/traveler-mongodb start
make db-restore # Select the last snapshot created during db-backup
```

### Start Application

```sh
./etc/init.d/traveler-webapp start
```

### Verify

```sh
./etc/init.d/traveler-webapp status
```

Then visit the application URL and confirm login works.

> **Note:** After upgrading, logs may show deprecation warnings from `findOneAndUpdate` operations. These are non-breaking and can be safely ignored.

## Rollback

If the migration fails, stop the application and restore the original MongoDB data:

```sh
./etc/init.d/traveler-webapp stop
./etc/init.d/traveler-mongodb stop
mv -v ../data/mongodb ../data/mongodb-failed
mv -v ../data/mongodb-<timestamp> ../data/mongodb

# Move the snapshot support back into support for mognodb and nodejs
./etc/init.d/traveler-mongodb start
./etc/init.d/traveler-webapp start
```
