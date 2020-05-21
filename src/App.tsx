import React, { useEffect } from 'react';
import * as lf from 'lovefield';

import { connectDB } from './data/db';

function App() {
  useEffect(() => {
    let db: lf.Database;

    connectDB().then((database: lf.Database) => {
      db = database;
    });

    return () => db && db.close();
  });

  return <div>Hello</div>;
}

export default App;
