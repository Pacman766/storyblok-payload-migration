import { storyblokEditable } from '@storyblok/react/rsc';

const CaseStudy = ({ blok }) => (
  <article {...storyblokEditable(blok)}>
    {blok.cover_image?.filename && (
      <img src={blok.cover_image.filename} alt={blok.description ?? ''} />
    )}
    <p>{blok.description}</p>
    {blok.tags?.length > 0 && (
      <ul>
        {blok.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    )}
  </article>
);

export default CaseStudy;
