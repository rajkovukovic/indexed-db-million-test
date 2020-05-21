export const randomFromRange = (min: number, max: number): number => {
  return Math.round(Math.random() * (max - min) + min);
};

const FIRST_ID = 1000;

export const generateMockData = (productCount: number, tagCount: number) => {
  const tagsPerProductMin = 3;
  const tagsPerProductMax = 10;

  const generateProductId = (id: number) => String(FIRST_ID + id + 1);

  const generateTagId = (id: number) => String(FIRST_ID + productCount + id + 1)

  if (tagCount < tagsPerProductMax) {
    throw new Error(`tagCount must be at least ${tagsPerProductMax}`);
  }

  const products = new Array(productCount);
  const relations = new Array<any>();

  for (let i = 0; i < productCount; i++) {
    const productId = generateProductId(i);
    products[i] = {
      id: productId,
      // name: 'Product_' + productId,
    };

    const productTagCount = randomFromRange(
      tagsPerProductMin,
      tagsPerProductMax
    );
    const currentProductTags = new Set<number>();

    while (currentProductTags.size < productTagCount) {
      currentProductTags.add(randomFromRange(0, tagCount - 1));
    }

    Array.from(currentProductTags).forEach((tagIndex) => {
      relations.push({
        productId,
        tagId: generateTagId(tagIndex),
      });
    });
  }

  const tags = new Array(tagCount);

  for (let i = 0; i < tagCount; i++) {
    const tagId = generateTagId(i);
    tags[i] = {
      id: tagId,
      // name: 'Tag_' + tagId,
    };
  }

  return { products, tags, relations };
};
