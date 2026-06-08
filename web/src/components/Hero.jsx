import { storyblokEditable } from '@storyblok/react/rsc';

const Hero = ({ blok }) => (
  <section {...storyblokEditable(blok)}>
    <h1>{blok.headline}</h1>
    {blok.subheadline && <p>{blok.subheadline}</p>}
    {blok.image?.filename && <img src={blok.image.filename} alt={blok.headline ?? ''} />}
    {blok.cta_label && blok.cta_url && <a href={blok.cta_url}>{blok.cta_label}</a>}
  </section>
);

export default Hero;
