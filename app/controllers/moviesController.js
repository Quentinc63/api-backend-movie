import axios from "axios";
import jwt from "jsonwebtoken";
import querystring from "node:querystring";
import ApiError from "../errors/ApiError.js";
import { Media, User, sequelize } from "../models/associations.js";
import { fetchMovieTMDB } from "../services/axios.js";
import functionSqL from "../utils/functionSql.js";
import findReleaseDate from "../utils/findReleaseDate.js";

const IMAGE_BASEURL = "https://image.tmdb.org/t/p";

const moviesController = {
  async getMoviesById(req, res, next) {
    const id = parseInt(req.params.id);
    // Fetch the movie from the TMDB API
    const movie = await fetchMovieTMDB(`/movie/${id}?language=fr-FR`);
    // If the response is an error, return a 400 response with the error message
    if (axios.isAxiosError(movie)) {
      return next(new ApiError(400, movie.response.data.status_message));
    }
    // Fetch the cast of the movie from the TMDB API
    const cast = await fetchMovieTMDB(`/movie/${id}/credits?language=fr-FR`);
    // doing a query to get the reviews of the movie with user information
    const reviews = await sequelize.query(
      `
                SELECT "review".id AS review_id, "review".content,  "user".firstname AS user_firstname,"media".id
                FROM media
                JOIN "review" ON "media".id = "review".media_id
                JOIN "user" ON review.user_id = "user".id
                WHERE "media".tmdb_id = :tmdb_id;
            `,
      {
        replacements: { tmdb_id: id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const movieInDb = await Media.findOne({ where: { tmdb_id: id } });
    let userData = null;
    // if the user is authenticated and the movie is in the database, get the user's rating and review of the movie
    if (req.headers["authorization"] && movieInDb) {
      // get the token from the header
      const token = req.headers["authorization"]?.slice(7);
      // verify the token
      const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
      req.userId = decoded.id;
      // get the user's rating and review of the movie
      const userInput = await User.findOne({
        attributes: ["id"],
        where: { id: req.userId },
        include: [
          {
            association: "medias_rating",
            attributes: [["id", "media_id"]],
            through: { attributes: ["value", ["id", "rating_id"]] },
            where: { id: movieInDb.id },
            required: false,
          },
          {
            association: "medias_review",
            attributes: [["id", "media_id"]],
            through: { attributes: ["content", ["id", "review_id"]] },
            where: { id: movieInDb.id },
            required: false,
          },
          {
            association: "medias_view",
            attributes: [["id", "media_id"]],
            where: { id: movieInDb.id },
            required: false,
          },
          {
            association: "playlists",
            attributes: ["name", ["id", "playlist_id"]],
            include: [
              {
                association: "medias",
                attributes: [["id", "media_id"]],
                where: { id: movieInDb.id },
              },
            ],
          },
        ],
      });
      const alreadyInPlaylist = userInput.playlists.map((playlist) => {
        return playlist.dataValues.playlist_id;
      });
      userData = {
        user_id: userInput.id,
        rating: userInput.medias_rating[0] ? userInput.medias_rating[0].rating : null,
        review: userInput.medias_review[0] ? userInput.medias_review[0].review : null,
        viewed: userInput.medias_view[0] ? true : false,
        in_playlists: alreadyInPlaylist,
      };
    }
    // i initialize the average rating to null and if the function return a result i assign the value to the variable
    let averageRating = null;
    if (movieInDb) {
      const result = await functionSqL.averageRating(movieInDb.id);
      averageRating = result;
    }
    const releaseDate = await findReleaseDate(id);
    // restructered data to send to the client
    const data = {
      tmdb_id: movie.id,
      id: reviews.length > 0 ? reviews[0].id : null,
      title_fr: movie.title,
      status: movie.status,
      original_title: movie.original_title,
      adult: movie.adult,
      // i check if the average rating is not null and i assign the value to the variable
      average_rating: averageRating ? averageRating.movie_average_rating : null,
      original_language: movie.original_language,
      release_date: releaseDate ? releaseDate : "1997-04-10",
      runtime: movie.runtime,
      budget: movie.budget,
      popularity: movie.popularity,
      rating: movie.vote_average,
      country: movie.origin_country,
      genres: movie.genres,
      tagline: movie.tagline,
      overview: movie.overview,
      poster_path: movie.poster_path ? `${IMAGE_BASEURL}/w300_and_h450_bestv2/${movie.poster_path}` : null,
      cast: cast.cast
        .map((actor) => {
          return {
            id: actor.cast_id,
            name: actor.name,
            character: actor.character,
            profile_path: actor.profile_path ? `${IMAGE_BASEURL}/w300_and_h300_bestv2${actor.profile_path}` : null,
          };
        })
        .slice(0, 5),
      crew: cast.crew
        // i filter for getting only the director of the movie
        .filter((crew) => crew.job === "Director")
        .map((crew) => {
          return {
            id: crew.id,
            name: crew.name,
            job: crew.job,
            profile_path: crew.profile_path ? `${IMAGE_BASEURL}/w300_and_h300_bestv2${crew.profile_path}` : null,
          };
        }),
      reviews: reviews,
      user_data: userData,
    };
    // return the data to the client
    return res.json({ status: "success", data: data });
  },
  async getMovies(req, res, next) {
    // node function to convert the object to a query string u need to import querystring
    const query = querystring.stringify(req.query);
    const moviesFetchFromTheApi = await fetchMovieTMDB(
      `/discover/movie?include_adult=false&include_video=false&language=fr-FR&region=fr&${query}`
    );
    // if the response is an error, return a 400 response with the error message
    if (!moviesFetchFromTheApi.results) {
      return next(new ApiError(404, "No movie found"));
    }
    const categoriesFetchFromTheapi = await fetchMovieTMDB("/genre/movie/list?language=fr");
    // if movies exist in the response, restructure the data to send to the client
    const movies = moviesFetchFromTheApi.results.map((movie) => {
      return {
        tmdb_id: movie.id,
        title_fr: movie.title,
        release_date: movie.release_date,
        poster_path: movie.poster_path ? `${IMAGE_BASEURL}/w300_and_h450_bestv2${movie.poster_path}` : null,
        // i map the genre_ids to get the genre name and id
        genres: movie.genre_ids
          ? movie.genre_ids.map((genre_id) => {
              // i find the genre with the genre_id
              const genre = categoriesFetchFromTheapi.genres.find((category) => category.id === genre_id);
              return { id: genre.id, name: genre.name };
            })
          : null,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
      };
    });
    return res.json({ status: "success", data: movies });
  },
  async getUpcomingMovies(req, res) {
    const moviesFetchFromTheApi = await fetchMovieTMDB("/movie/upcoming?language=fr-FR&region=FR");
    const categoriesFetchFromTheapi = await fetchMovieTMDB("/genre/movie/list?language=fr");
    const movies = moviesFetchFromTheApi.results.map((movie) => {
      return {
        tmdb_id: movie.id,
        title_fr: movie.title,
        release_date: movie.release_date,
        poster_path: movie.poster_path ? `${IMAGE_BASEURL}/w300_and_h450_bestv2${movie.poster_path}` : null,
        genres: movie.genre_ids
          ? movie.genre_ids.map((genre_id) => {
              const genre = categoriesFetchFromTheapi.genres.find((category) => category.id === genre_id);
              return { id: genre.id, name: genre.name };
            })
          : null,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
      };
    });
    return res.json({ status: "success", data: movies });
  },
  async getNowPlayingMovies(req, res) {
    const moviesFetchFromTheApi = await fetchMovieTMDB("/movie/now_playing?language=fr-FR&region=FR");
    const categoriesFetchFromTheapi = await fetchMovieTMDB("/genre/movie/list?language=fr");
    const movies = moviesFetchFromTheApi.results.map((movie) => {
      return {
        tmdb_id: movie.id,
        title_fr: movie.title,
        release_date: movie.release_date,
        poster_path: movie.poster_path ? `${IMAGE_BASEURL}/w300_and_h450_bestv2${movie.poster_path}` : null,
        genres: movie.genre_ids
          ? movie.genre_ids.map((genre_id) => {
              const genre = categoriesFetchFromTheapi.genres.find((category) => category.id === genre_id);
              return { id: genre.id, name: genre.name };
            })
          : null,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
      };
    });
    return res.json({ status: "success", data: movies });
  },
  async getPopularMovies(req, res) {
    const moviesFetchFromTheApi = await fetchMovieTMDB("/movie/popular?language=fr-FR&region=FR");
    const categoriesFetchFromTheapi = await fetchMovieTMDB("/genre/movie/list?language=fr");
    const movies = moviesFetchFromTheApi.results.map((movie) => {
      return {
        tmdb_id: movie.id,
        title_fr: movie.title,
        release_date: movie.release_date,
        poster_path: movie.poster_path ? `${IMAGE_BASEURL}/w300_and_h450_bestv2${movie.poster_path}` : null,
        genres: movie.genre_ids
          ? movie.genre_ids.map((genre_id) => {
              const genre = categoriesFetchFromTheapi.genres.find((category) => category.id === genre_id);
              return { id: genre.id, name: genre.name };
            })
          : null,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
      };
    });
    return res.json({ status: "success", data: movies });
  },
  async getTopRatedMovies(req, res) {
    const moviesFetchFromTheApi = await fetchMovieTMDB("/movie/top_rated?language=fr-FR&region=FR");
    const categoriesFetchFromTheapi = await fetchMovieTMDB("/genre/movie/list?language=fr");
    const movies = moviesFetchFromTheApi.results.map((movie) => {
      return {
        tmdb_id: movie.id,
        title_fr: movie.title,
        release_date: movie.release_date,
        poster_path: movie.poster_path ? `${IMAGE_BASEURL}/w300_and_h450_bestv2${movie.poster_path}` : null,
        genres: movie.genre_ids
          ? movie.genre_ids.map((genre_id) => {
              const genre = categoriesFetchFromTheapi.genres.find((category) => category.id === genre_id);
              return { id: genre.id, name: genre.name };
            })
          : null,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
      };
    });
    return res.json({ status: "success", data: movies });
  },
  async getMovieBySearch(req, res) {
    const moviesFetchFromTheApi = await fetchMovieTMDB(`/search/movie?query=${req.query.query}&language=fr-FR`);
    const movies = moviesFetchFromTheApi.results.map((movie) => {
      return {
        tmdb_id: movie.id,
        title_fr: movie.title,
        release_date: movie.release_date,
      };
    });
    return res.json({ status: "success", data: movies });
  },
  async getMovieGenres(req, res) {
    const categoriesFetchFromTheapi = await fetchMovieTMDB("/genre/movie/list?language=fr");
    const categories = categoriesFetchFromTheapi.genres.map((category) => {
      return {
        id: category.id,
        name: category.name,
      };
    });
    return res.json({ status: "success", data: categories });
  },
};

export default moviesController;
