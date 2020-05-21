import * as lf from 'lovefield';

import { productsDB } from './schema';
import { generateMockData } from './generate-mock';


const idGetter = (thing: any) => thing.id;
const namedIdGetter = (name: string) => (thing: any) => thing[name].id;

let products: any[];
let tags: any[];
let relations: any[];
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
  ({ products, tags, relations } = generateMockData(1000 * 1000, 20 * 1000));
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
  var product = db.getSchema().table('Product');
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
  let product: lf.schema.Table;
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
      product = db.getSchema().table('Product')
      tag = db.getSchema().table('Tag')
      productTag = db.getSchema().table('ProductTag')
      return checkForExistingData(database);
    })
    .then((dataExist: boolean) => {
      console.log({ dataExist });
      if (dataExist) return Promise.resolve();
      return dataExist ? Promise.resolve() : addSampleData(db) as any;
    }).then(async () => {

      console.time('selectedTagIds');
      const selectedTagIds = (await db.select(tag.id)
        .from(tag)
        .limit(2)
        .exec()).map((tag: any) => tag.id);
      console.timeEnd('selectedTagIds');

      // const tagRelations = await db.select()
      //   .from(productTag)
      //   .where(productTag.tagId.in(selectedTagIds))
      //   .exec();

      console.time('filteredProducts');
      const filteredProducts = await db.select(product.id)
        .from(product, productTag)
        .where(lf.op.and(
          product.id.eq(productTag.productId),
          productTag.tagId.in(selectedTagIds)
        ))
        .groupBy(product.id)
        .exec();
      console.timeEnd('filteredProducts');
      console.log(filteredProducts.length);

      // 
      console.time('allRelations-select-all');
      const allRelations = (await db.select().from(productTag).orderBy(productTag.productId).exec())
        .map((relation: any) => [relation.productId, relation.tagId]);
      console.timeEnd('allRelations-select-all');
      console.log(allRelations.length);

      const filteredProductIdSet = new Set(filteredProducts.map(namedIdGetter('Product')));
      const tagSet = new Set();
      console.time('in-memory-filtering-for-all-relations');
      for (let [productId, tagId] of allRelations) {
        if (filteredProductIdSet.has(productId)) {
          tagSet.add(tagId);
        }
      }
      console.timeEnd('in-memory-filtering-for-all-relations');
      console.log(tagSet.size);

      return db;

      console.time('filteredTags');
      const filteredTags = await db.select(tag.id)
        .from(tag, productTag)
        .where(lf.op.or(
          tag.id.eq(productTag.tagId),
          productTag.productId.in(filteredProducts.map(namedIdGetter('Product')))
        ))
        .groupBy(tag.id)
        .exec();
      console.timeEnd('filteredTags');
      console.log(filteredTags.length);

      // const productRelations = await db.select()
      //   .from(productTag)
      //   .where(productTag.tagId.in(filteredTags as any))
      //   .exec();

      // console.log({
      //   selectedTagIds,
      //   filteredProductIds: filteredProducts.map((w: any) => w.Product.id),
      //   filteredProducts,
      //   filteredTagIds: filteredTags.map((w: any) => w.Tag.id),
      //   filteredTags,
      //   tagRelations,
      //   productRelations
      // });

      return db;
    });
}
