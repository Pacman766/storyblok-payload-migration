import { storyblokEditable } from '@storyblok/react/rsc';

const TeamMember = ({ blok }) => (
  <article {...storyblokEditable(blok)}>
    {blok.photo?.filename && <img src={blok.photo.filename} alt={blok.name ?? ''} />}
    <h2>{blok.name}</h2>
    {blok.role && <p>{blok.role}</p>}
    {blok.bio && <p>{blok.bio}</p>}
  </article>
);

export default TeamMember;
