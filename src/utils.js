export const getImageUrl = (path) => {
    return process.env.PUBLIC_URL + `/visemes/viseme_id_${path}.svg`;
  };