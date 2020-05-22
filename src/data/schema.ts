import * as lf from 'lovefield';

interface DB {
  getSchemaBuilder: () => lf.schema.Builder;
}

export const productsDB: DB = {
  getSchemaBuilder: function (): lf.schema.Builder {
    let sc = lf.schema.create('Lio', 1);
    // sc.createTable('Product')
    //   .addColumn('id', lf.Type.INTEGER)
    //   // .addColumn('name', lf.Type.STRING)
    //   .addPrimaryKey(['id']);

    sc.createTable('Tag')
      .addColumn('id', lf.Type.INTEGER)
      .addColumn('productIds', lf.Type.OBJECT)
      // .addColumn('name', lf.Type.STRING)
      .addPrimaryKey(['id']);

    sc.createTable('ProductTag')
      .addColumn('productTagMap', lf.Type.OBJECT)
      // .addColumn('productId', lf.Type.INTEGER)
      // .addColumn('tagId', lf.Type.INTEGER)
      // .addForeignKey('fk_ProductId', {
      //   local: 'productId',
      //   ref: 'Product.id',
      // })
      // .addForeignKey('fk_TagId', {
      //   local: 'tagId',
      //   ref: 'Tag.id',
      // })
      // .addIndex('productIdIndex', ['productId'], false, lf.Order.ASC)
      // .addIndex('tagIdIndex', ['tagId'], false, lf.Order.ASC);

    return sc;
  }
}
