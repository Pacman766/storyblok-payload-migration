import { storyblokEditable } from '@storyblok/react/rsc';

const ServiceItem = ({ blok }) => (
  <article {...storyblokEditable(blok)}>
    {blok.icon && <span>{blok.icon}</span>}
    <h2>{blok.title}</h2>
    {blok.description && <p>{blok.description}</p>}
  </article>
);

export default ServiceItem;
