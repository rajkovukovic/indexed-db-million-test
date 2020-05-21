export const generateMockData = () => {
  const movies = [
    {
      "id": "2000",
      "title": "In & Out",
      "year": 1997,
      "rating": "PG-13",
      "company": "Paramount Pictures"
    }
  ]

  const actors = [
    {
      "id": "19",
      "lastName": "Aaron",
      "firstName": "Caroline",
      "sex": "Female",
      "dateOfBirth": "19520807",
      "dateOfDeath": ""
    }
  ]

  const movieActors = [
    {
      "movieId": "2000",
      "actorId": "19",
      "role": "Herself"
    },
  ]

  return { movies, actors, movieActors };
};
