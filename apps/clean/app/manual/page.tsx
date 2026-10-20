import { FullScreenIcon, PlayIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { pageTitle } from '../../lib/route-meta';

/**
 * `/manual` — the illustrated mode d'emploi (spec #3, US 5 & 26). Faithful port
 * of the legacy Angular manual page: four cards (principle,
 * P2 walkthrough with screenshots, resume later, Menu drawer), the seven
 * screenshots under `/manual/`, and the back-to-home button. The visible `<h1>`
 * comes from the root layout header; the `<title>` from `pageTitle('/manual')`.
 */
export async function generateMetadata(): Promise<Metadata> {
  return { title: pageTitle('/manual') };
}

/** Decorative inline icon, equivalent of the legacy `<hugeicons-icon alt="">`. */
interface InlineIconProps {
  readonly icon: typeof PlayIcon;
}

function InlineIcon({ icon }: InlineIconProps) {
  return (
    <HugeiconsIcon
      aria-hidden
      className="inline-block align-middle"
      icon={icon}
      strokeWidth={1.5}
    />
  );
}

export default function ManualPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 sm:gap-8">
      <section className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-secondary text-xl sm:text-2xl">Le principe en 3 temps</h2>
          <p className="text-sm sm:text-base">
            Chaque parcours se fait en 3 temps :<strong>aller</strong>
            jusqu&apos;au départ depuis le lieu de rendez-vous,
            <strong>nettoyer</strong>
            le parcours en ramassant les déchets, puis
            <strong>revenir</strong>
            au lieu de rendez-vous.
          </p>
          <figure className="flex flex-col">
            <img
              alt="Page d'accueil avec la liste des parcours à vélo et à pied"
              className="rounded-lg border border-base-300 shadow-sm"
              loading="lazy"
              src="/manual/01-accueil.png"
            />
            <figcaption className="pt-2 text-center text-sm opacity-70">
              Sur l&apos;accueil, choisissez un parcours à vélo ou à pied.
            </figcaption>
          </figure>
          <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base">
            <li>
              Sur
              <strong>l&apos;accueil,</strong>
              trouvez votre zone puis la liste des parcours. Chaque parcours affiche sa distance et
              un bouton de lecture
              <InlineIcon icon={PlayIcon} />
              pour le commencer.
            </li>
            <li>
              Pendant le parcours, une
              <strong>carte</strong>
              vous montre le chemin, avec les 3 étapes en haut et les boutons
              <strong>Précédent, Suivant et Terminer</strong>
              en bas. Vous pouvez
              <strong>zoomer et dézoomer</strong>
              avec les boutons
              <kbd className="kbd kbd-sm">+</kbd>
              et
              <kbd className="kbd kbd-sm">−</kbd>
              de la carte (ou en pinçant l&apos;écran avec deux doigts), et passer la carte en
              <strong>plein écran</strong>
              avec le bouton
              <InlineIcon icon={FullScreenIcon} />
              en haut à gauche de la carte.
            </li>
            <li>
              Votre
              <strong>progression est enregistrée automatiquement</strong>
              sur votre téléphone : vous pouvez fermer la page et reprendre plus tard.
            </li>
          </ul>
        </div>
      </section>

      <section className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-secondary text-xl sm:text-2xl">
            Exemple : faire le parcours Bruz Sud P2
          </h2>
          <p className="text-sm sm:text-base">
            Le parcours
            <strong>P2</strong>
            de
            <strong>Bruz Sud</strong>
            fait
            <strong>800 mètres</strong>
            de nettoyage. Comptez un petit trajet pour aller au départ depuis le lieu de
            rendez-vous, puis pour revenir à la fin.
          </p>

          <ol className="flex flex-col gap-6">
            <li>
              <p className="pb-2 text-sm sm:text-base">
                <strong>1. Choisissez P2.</strong>
                Sur l&apos;accueil, ouvrez la zone
                <strong>Bruz Sud</strong>
                puis regardez dans
                <strong>Parcours à pied</strong>
                et appuyez sur le bouton de lecture
                <InlineIcon icon={PlayIcon} />
                de la ligne
                <strong>P2</strong>
                ci-dessous.
              </p>
              <figure className="flex flex-col">
                <img
                  alt="Ligne P2 800 mètres avec son bouton de lecture"
                  className="rounded-lg border border-base-300 shadow-sm"
                  loading="lazy"
                  src="/manual/02-choisir-p2.png"
                />
                <figcaption className="pt-2 text-center text-sm opacity-70">
                  Appuyez sur le bouton de lecture de la ligne P2.
                </figcaption>
              </figure>
            </li>

            <li>
              <p className="pb-2 text-sm sm:text-base">
                <strong>2. Première étape : l&apos;aller.</strong>
                La carte vous montre le chemin du
                <strong>lieu de rendez-vous</strong>
                jusqu&apos;au départ du parcours. Marchez jusque-là, puis appuyez sur
                <strong>Suivant</strong>
                en bas de l&apos;écran.
              </p>
              <figure className="flex flex-col">
                <img
                  alt="Carte de la première étape avec le bouton Suivant en bas"
                  className="rounded-lg border border-base-300 shadow-sm"
                  loading="lazy"
                  src="/manual/03-etape-debut.png"
                />
                <figcaption className="pt-2 text-center text-sm opacity-70">
                  Suivez le chemin jusqu&apos;au départ, puis appuyez sur Suivant.
                </figcaption>
              </figure>
            </li>

            <li>
              <p className="pb-2 text-sm sm:text-base">
                <strong>3. Deuxième étape : le nettoyage.</strong>
                La carte vous montre le parcours de
                <strong>800 mètres</strong>: ramassez les déchets tout le long, puis appuyez sur
                <strong>Suivant</strong>
                en bas de l&apos;écran.
              </p>
              <figure className="flex flex-col">
                <img
                  alt="Carte de l'étape de nettoyage du parcours P2"
                  className="rounded-lg border border-base-300 shadow-sm"
                  loading="lazy"
                  src="/manual/04-etape-nettoyage.png"
                />
                <figcaption className="pt-2 text-center text-sm opacity-70">
                  Ramassez les déchets sur les 800 mètres, puis appuyez sur Suivant.
                </figcaption>
              </figure>
            </li>

            <li>
              <p className="pb-2 text-sm sm:text-base">
                <strong>4. Troisième étape : le retour.</strong>
                La carte vous montre le chemin pour revenir au
                <strong>lieu de rendez-vous</strong>: une fois arrivé, appuyez sur
                <strong>Terminer</strong>
                en bas de l&apos;écran pour valider.
              </p>
              <figure className="flex flex-col">
                <img
                  alt="Carte de l'étape de retour avec le bouton Terminer en bas"
                  className="rounded-lg border border-base-300 shadow-sm"
                  loading="lazy"
                  src="/manual/05-etape-fin.png"
                />
                <figcaption className="pt-2 text-center text-sm opacity-70">
                  Revenez au lieu de rendez-vous, puis appuyez sur Terminer.
                </figcaption>
              </figure>
            </li>
          </ol>
        </div>
      </section>

      <section className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-secondary text-xl sm:text-2xl">Reprendre plus tard</h2>
          <p className="text-sm sm:text-base">
            Vous devez vous arrêter en plein milieu ? Pas d&apos;inquiétude : votre téléphone garde
            en mémoire l&apos;endroit où vous vous êtes arrêté, même si vous fermez la page ou si
            votre téléphone s&apos;éteint. Rien n&apos;est perdu.
          </p>
          <figure className="flex flex-col">
            <img
              alt="Message proposant de reprendre le parcours Bruz Sud P2 en haut de l'accueil"
              className="rounded-lg border border-base-300 shadow-sm"
              loading="lazy"
              src="/manual/07-reprendre.png"
            />
            <figcaption className="pt-2 text-center text-sm opacity-70">
              Ici, le parcours avait été arrêté pendant le nettoyage : le message propose de
              reprendre à l&apos;étape 2 sur 3.
            </figcaption>
          </figure>
          <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base">
            <li>
              Quand vous revenez sur l&apos;accueil, un
              <strong>message apparaît tout en haut</strong>: il vous propose de reprendre votre
              parcours.
            </li>
            <li>
              Le message vous dit où vous étiez :<strong>étape 1 sur 3</strong>
              (le chemin pour aller au départ),
              <strong>étape 2 sur 3</strong>
              (le ramassage des déchets) ou
              <strong>étape 3 sur 3</strong>
              (le chemin du retour).
            </li>
            <li>
              Appuyez sur le
              <strong>bouton de lecture du message</strong>
              <InlineIcon icon={PlayIcon} />: vous retrouvez votre carte exactement là où vous
              l&apos;aviez laissée.
            </li>
            <li>
              Une fois le parcours terminé, le message
              <strong>disparaît</strong>: il n&apos;y a plus rien à reprendre.
            </li>
          </ul>
        </div>
      </section>

      <section className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-secondary text-xl sm:text-2xl">
            Le bouton Menu pendant le parcours
          </h2>
          <p className="text-sm sm:text-base">
            En haut à droite de la carte, le bouton
            <strong>Menu</strong>
            donne accès à des documents et des itinéraires utiles pour votre parcours.
          </p>
          <figure className="flex flex-col">
            <img
              alt="Contenu du menu ouvert sur le parcours P2"
              className="rounded-lg border border-base-300 shadow-sm"
              loading="lazy"
              src="/manual/06-menu.png"
            />
            <figcaption className="pt-2 text-center text-sm opacity-70">
              Le bouton Menu donne accès aux documents et aux itinéraires du parcours.
            </figcaption>
          </figure>
          <ul className="space-y-4 text-sm sm:text-base">
            <li>
              <strong>Télécharger le PDF :</strong>
              une fiche du parcours à imprimer ou à garder sur votre téléphone.
            </li>
            <li>
              <strong>Télécharger le fichier pour aller au départ :</strong>
              le chemin depuis le lieu de rendez-vous jusqu&apos;au départ, à ouvrir dans votre
              téléphone.
            </li>
            <li>
              <strong>Télécharger le fichier du parcours :</strong>
              le parcours de nettoyage lui-même, à suivre sur le terrain.
            </li>
            <li>
              <strong>Télécharger le fichier pour revenir :</strong>
              le chemin de la fin du parcours jusqu&apos;au lieu de rendez-vous.
            </li>
            <li>
              <strong>Revenir au lieu de rendez-vous depuis ma position (via GeoVelo) :</strong>
              ouvre le guidage à vélo depuis l&apos;endroit où vous vous trouvez, pratique si vous
              vous êtes éloigné du parcours.
            </li>
            <li>
              <strong>Itinéraire vers le point de départ (via GeoVelo) :</strong>
              ouvre le guidage à vélo du lieu de rendez-vous jusqu&apos;au départ du parcours.
            </li>
            <li>
              <strong>Itinéraire pour revenir (via GeoVelo) :</strong>
              ouvre le guidage à vélo de la fin du parcours jusqu&apos;au lieu de rendez-vous.
            </li>
          </ul>
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-3 pb-4">
        <Link className="btn btn-primary" href="/">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
