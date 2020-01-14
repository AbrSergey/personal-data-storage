db.system.js.save({
  _id: "Add", 
  value: (token) => { 
    // const Fk1 = token.Fk1;
    // const Gk2 = token.Gk2;
    // const c = token.c;
    // const words = token.words;

    // db.getCollection("indexTs").insert({6: "6"});
    let entities = db.indexTs.find({_id: ObjectId("5e1a973a413605c9bd3c8867")});
    print("Customer Name: " + entities[0].name)

    // entities[0].name = "books";
    let res = db.indexTs.update({_id: ObjectId("5e1a973a413605c9bd3c8867") }, {
      $set: {
        name: "books"
      }
    })

    return res;
  }
})






//db.system.js.distinct("_id");
//db.loadServerScripts();
//Add