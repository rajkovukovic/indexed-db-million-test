import * as lf from 'lovefield';

import { moviesDB } from './schema';
import { generateMockData } from './generate-mock';

function addSampleData(db: lf.Database) {
  const { movies, actors, movieActors } = generateMockData();
  console.log({ movies, actors, movieActors });

  return Promise.all([
    insertData(db, movies, db.getSchema().table('Movie')),
    insertData(db, actors, db.getSchema().table('Actor')),
    insertData(db, movieActors, db.getSchema().table('MovieActor')),
  ]).then(function (queries) {
    var tx = db.createTransaction();
    return tx.exec(queries);
  });
}

function insertData(db: lf.Database, data: any[], tableSchema: lf.schema.Table) {
  let rows = data.map((dataItem: any) =>
    tableSchema.createRow(dataItem)
  );

  return db.insert().into(tableSchema).values(rows);
}

function checkForExistingData(db: lf.Database) {
  var product = db.getSchema().table('Movie');
  var column = lf.fn.count(product.id);
  return db
    .select(column)
    .from(product)
    .exec()
    .then(function (rows) {
      return (rows[0] as any)[column.getName()] > 0;
    });
}

export function connectDB() {
  let db: lf.Database;

  return moviesDB
    .getSchemaBuilder()
    .connect({
      storeType: lf.schema.DataStoreType.WEB_SQL,
    })
    .then(function (database) {
      console.log({ database });
      db = database;
      return checkForExistingData(database);
    })
    .then()
    .then((dataExist: boolean) => {
      console.log({ dataExist });
      if (dataExist) return Promise.resolve();
      return dataExist ? Promise.resolve() : addSampleData(db) as any;
    }).then(() => {
      return db;
    });
}
