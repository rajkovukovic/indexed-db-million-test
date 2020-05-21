import * as lf from 'lovefield';

import { productsDB } from './schema';
import { generateMockData } from './generate-mock';


let products: any[] = [];
let tags: any[] = [];
let relations: any[] = [];
let insertProgress: any = {
  productsDone: 0,
  tagsDone: 0,
  relationsDone: 0,
  mainPromise: null,
  mainPromiseResolve: null
};

const INSERT_PER_TRANSACTION = 10000;

async function bulkInsertData(db: lf.Database) {
  let promise = null;

  if (insertProgress.productsDone < products.length) {
    const data = products.slice(insertProgress.productsDone, insertProgress.productsDone + INSERT_PER_TRANSACTION);
    insertProgress.productsDone += INSERT_PER_TRANSACTION;
    promise = insertData(db, data, db.getSchema().table('Product'));
    console.log('productsDone', insertProgress.productsDone);
  } else if (insertProgress.tagsDone < tags.length) {
    const data = tags.slice(insertProgress.tagsDone, insertProgress.tagsDone + INSERT_PER_TRANSACTION);
    insertProgress.tagsDone += INSERT_PER_TRANSACTION;
    promise = insertData(db, data, db.getSchema().table('Tag'));
    console.log('tagsDone', insertProgress.tagsDone);
  } else if (insertProgress.relationsDone < relations.length) {
    const data = relations.slice(insertProgress.relationsDone, insertProgress.relationsDone + INSERT_PER_TRANSACTION);
    insertProgress.relationsDone += INSERT_PER_TRANSACTION;
    promise = insertData(db, data, db.getSchema().table('ProductTag'));
    console.log('relationsDone', insertProgress.relationsDone);
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
  ({ tags } = generateMockData(1000 * 1000, 50 * 1000));
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

  return productsDB
    .getSchemaBuilder()
    .connect({
      storeType: lf.schema.DataStoreType.INDEXED_DB,
    })
    .then(function (database) {
      console.log({ database });
      db = database;
      tag = db.getSchema().table('Tag')
      return checkForExistingData(database);
    })
    .then((dataExist: boolean) => {
      console.log({ dataExist });
      if (dataExist) return Promise.resolve();
      return dataExist ? Promise.resolve() : addSampleData(db) as any;
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


      console.time('get-allTags');
      const allTags = (await db.select()
        .from(tag)
        .exec());
      console.timeEnd('get-allTags');
      console.log({ allTags });

      // console.time('filter-tags');
      // let filteredTagIds = new Set<number>();
      // for (let tag of allTags) {
      //   for (let productId of (tag as any).productIds) {
      //     if (filteredProductIds.has(productId)) {
      //       filteredTagIds.add((tag as any).id);
      //       break;
      //     }
      //   }
      // }
      // console.timeEnd('filter-tags');


      console.time('generate-product-map');
      const productsMap = allTags.reduce((acc: Map<number, number[]>, tag: any) => {
        for (let productId of tag.productIds) {
          if (!acc.has(productId)) {
            acc.set(productId, [tag.id]);
          } else {
            acc.get(productId)!.push(tag.id);
          }
        }
        return acc;
      }, new Map<number, number[]>());
      console.timeEnd('generate-product-map');
      console.log('product count:', productsMap.size);

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
