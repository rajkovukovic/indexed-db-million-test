import * as lf from 'lovefield';

interface DB {
  getSchemaBuilder: () => lf.schema.Builder;
}

export const moviesDB: DB = {
  getSchemaBuilder: function (): lf.schema.Builder {
    var ds = lf.schema.create('mvdb', 1);
    ds.createTable('Movie')
      .addColumn('id', lf.Type.INTEGER)
      .addColumn('title', lf.Type.STRING)
      .addColumn('year', lf.Type.INTEGER)
      .addColumn('rating', lf.Type.STRING)
      .addColumn('company', lf.Type.STRING)
      .addPrimaryKey(['id']);

    ds.createTable('Actor')
      .addColumn('id', lf.Type.INTEGER)
      .addColumn('lastName', lf.Type.STRING)
      .addColumn('firstName', lf.Type.STRING)
      .addColumn('sex', lf.Type.STRING)
      .addColumn('dateOfBirth', lf.Type.DATE_TIME)
      .addColumn('dateOfDeath', lf.Type.DATE_TIME)
      .addPrimaryKey(['id'])
      .addNullable(['dateOfDeath']);

    ds.createTable('Director')
      .addColumn('id', lf.Type.INTEGER)
      .addColumn('lastName', lf.Type.STRING)
      .addColumn('firstName', lf.Type.STRING)
      .addColumn('dateOfBirth', lf.Type.DATE_TIME)
      .addColumn('dateOfDeath', lf.Type.DATE_TIME)
      .addPrimaryKey(['id'])
      .addNullable(['dateOfDeath']);

    ds.createTable('MovieGenre')
      .addColumn('movieId', lf.Type.INTEGER)
      .addColumn('genre', lf.Type.STRING)
      .addForeignKey('fk_MovieId', {
        local: 'movieId',
        ref: 'Movie.id'
      });

    ds.createTable('MovieDirector')
      .addColumn('movieId', lf.Type.INTEGER)
      .addColumn('directorId', lf.Type.INTEGER)
      .addForeignKey('fk_MovieId', {
        local: 'movieId',
        ref: 'Movie.id'
      })
      .addForeignKey('fk_DirectorId', {
        local: 'directorId',
        ref: 'Director.id'
      });

    ds.createTable('MovieActor')
      .addColumn('movieId', lf.Type.INTEGER)
      .addColumn('actorId', lf.Type.INTEGER)
      .addColumn('role', lf.Type.STRING)
      .addForeignKey('fk_MovieId', {
        local: 'movieId',
        ref: 'Movie.id'
      })
      .addForeignKey('fk_ActorId', {
        local: 'actorId',
        ref: 'Actor.id'
      });

    return ds;
  }
}
