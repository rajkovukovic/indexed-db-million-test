import * as lf from 'lovefield';

import { productsDB } from './schema';
import { generateMockData } from './generate-mock';


let tags: any[] = [];
let insertProgress: any = {
  productsDone: 0,
  tagsDone: 0,
  relationsDone: 0,
  secondTableDone: false,
  mainPromise: null,
  mainPromiseResolve: null
};

const INSERT_PER_TRANSACTION = 10000;

async function bulkInsertData(db: lf.Database) {
  let promise = null;

  if (insertProgress.tagsDone < tags.length) {
    const data = tags.slice(insertProgress.tagsDone, insertProgress.tagsDone + INSERT_PER_TRANSACTION);
    insertProgress.tagsDone += INSERT_PER_TRANSACTION;
    promise = insertData(db, data, db.getSchema().table('Tag'));
    console.log('inserting tags', insertProgress.tagsDone);
  } else if (!insertProgress.secondTableDone) {
    console.log('inserting productTagMap');
    const productsMap = tags.reduce((acc: Map<number, number[]>, tag: any) => {
      for (let productId of tag.productIds) {
        if (!acc.has(productId)) {
          acc.set(productId, [tag.id]);
        } else {
          acc.get(productId)!.push(tag.id);
        }
      }
      return acc;
    }, new Map<number, number[]>());
    promise = insertData(
      db,
      [{ productTagMap: productsMap }],
      db.getSchema().table('ProductTag')
    );
    insertProgress.secondTableDone = true;
  }

  if (promise) {
    const queries = await Promise.all([promise]);
    let tx = db.createTransaction();
    await tx.exec(queries);
    setTimeout(() => bulkInsertData(db), 10);
  } else {
    insertProgress.mainPromiseResolve();
  }
}

function addSampleData(db: lf.Database) {
  console.time('generateMockData');
  // ({ products, tags } = generateMockData(20 * 1000, 1 * 1000));
  ({ tags } = generateMockData(2 * 1000 * 1000, 50 * 1000));
  console.timeEnd('generateMockData');
  // console.log(JSON.stringify({ products, tags, relations }));

  insertProgress.mainPromise = new Promise(resolve => insertProgress.mainPromiseResolve = resolve);

  console.time('addSampleData');
  bulkInsertData(db);

  return insertProgress.mainPromise.then((result: any) => {
    console.timeEnd('addSampleData');
    return result;
  });
}

function insertData(db: lf.Database, data: any[], tableSchema: lf.schema.Table) {
  let rows = data.map((dataItem: any) =>
    tableSchema.createRow(dataItem)
  );

  return db.insert().into(tableSchema).values(rows);
}

function checkForExistingData(db: lf.Database) {
  var product = db.getSchema().table('Tag');
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
  let tag: lf.schema.Table;
  let productTag: lf.schema.Table;

  return productsDB
    .getSchemaBuilder()
    .connect({
      storeType: lf.schema.DataStoreType.INDEXED_DB,
    })
    .then(function (database) {
      console.log({ database });
      db = database;
      tag = db.getSchema().table('Tag')
      productTag = db.getSchema().table('ProductTag')
      return checkForExistingData(database);
    })
    .then((dataExist: boolean) => {
      console.log({ dataExist });
      if (dataExist) return Promise.resolve()
      else return addSampleData(db);
    }).then(async () => {

      let selectedTagIds = [42, 512];

      console.time('filter-products');
      const selectedTags: any[] = (await db.select()
        .from(tag)
        .where(tag.id.in(selectedTagIds))
        .exec());

      const filteredProductIds = new Set<number>([...selectedTags[0].productIds, ...selectedTags[1].productIds]);
      console.timeEnd('filter-products');
      console.log({ filteredProductIds: Array.from(filteredProductIds) });


      console.time('get-product-to-tag-map');
      const productsMap = ((await db.select()
        .from(productTag)
        .exec())[0] as any).productTagMap;
      console.timeEnd('get-product-to-tag-map');
      console.log({ productsMap });

      console.time('filter-tags');
      let filteredTagIds = new Set<number>();
      for (let productId of Array.from(filteredProductIds)) {
        for (let tagId of productsMap.get(productId)!) {
          filteredTagIds.add(tagId);
        }
      }
      console.timeEnd('filter-tags');

      console.log({
        filteredProductIds: Array.from(filteredProductIds),
        filteredTagIds: Array.from(filteredTagIds),
      })

      return db;
    });
}
