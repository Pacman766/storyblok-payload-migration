import { storyblokEditable } from '@storyblok/react/rsc';

const Testimonial = ({ blok }) => (
  <blockquote {...storyblokEditable(blok)}>
    <p>{blok.quote}</p>
    {blok.author_photo?.filename && (
      <img src={blok.author_photo.filename} alt={blok.author_name ?? ''} />
    )}
    <footer>
      <strong>{blok.author_name}</strong>
      {blok.author_role && <span>{blok.author_role}</span>}
    </footer>
  </blockquote>
);

export default Testimonial;
