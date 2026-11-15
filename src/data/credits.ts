import type { CreditsResponse } from '../types/api'

/**
 * Copy of the backend's GET /credits, so the data credits are always on screen, even when the
 * server is asleep or down. The panel shows the server's own list as soon as it answers.
 * (SPHEREx, Gaia, WISE and SIMBAD all ask to be cited.)
 */
export const LOCAL_CREDITS: CreditsResponse = {
  "data_credits": [
    {
      "id": "spherex_dr1",
      "source": "SPHEREx (NASA/JPL/Caltech), served by IRSA/IPAC",
      "dataset": "SPHEREx Data Release 1, collection spherex_dr1",
      "used_for": "All images, difference images, spectra and light curves: Level 2 Spectral Images (MEF), downloaded as server-side cutouts",
      "citation": null,
      "doi": "10.26131/IRSA678",
      "url": "https://www.ipac.caltech.edu/doi/10.26131/IRSA678",
      "access": "https://irsa.ipac.caltech.edu/SIA"
    },
    {
      "id": "spherex_qr3",
      "source": "SPHEREx (NASA/JPL/Caltech), served by IRSA/IPAC",
      "dataset": "SPHEREx Quick Release 3, collection spherex_qr3",
      "used_for": "All images, difference images, spectra and light curves: Level 2 Spectral Images (MEF), downloaded as server-side cutouts",
      "citation": null,
      "doi": "10.26131/IRSA662",
      "url": "https://www.ipac.caltech.edu/doi/10.26131/IRSA662",
      "access": "https://irsa.ipac.caltech.edu/SIA"
    },
    {
      "id": "gaia_dr3",
      "source": "Gaia DR3 (ESA)",
      "dataset": "Gaia Data Release 3",
      "used_for": "Reference positions and proper motions of Barnard's Star, Epsilon Indi B, RW Aurigae and R Draconis, propagated to each SPHEREx exposure date",
      "citation": "Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1",
      "doi": null,
      "url": "https://gea.esac.esa.int/archive/",
      "access": null
    },
    {
      "id": "wise",
      "source": "WISE (NASA)",
      "dataset": "WISE",
      "used_for": "Reference position of WISE 0855-0714 (from its WISE designation, epoch ~2010.4); proper motion from Luhman & Esplin (2016, AJ 152, 78)",
      "citation": "Luhman & Esplin (2016, AJ 152, 78)",
      "doi": null,
      "url": "https://irsa.ipac.caltech.edu/Missions/wise.html",
      "access": null
    },
    {
      "id": "simbad",
      "source": "SIMBAD astronomical database, CDS, Strasbourg Astronomical Observatory, France",
      "dataset": "SIMBAD",
      "used_for": "Catalogued objects (identifier, type, position, proper motion, magnitude, bibliographic references) marked on the SPHEREx images, with positions propagated to the observation date",
      "citation": "Wenger et al. 2000, A&AS 143, 9",
      "doi": "10.1051/aas:2000332",
      "url": "https://simbad.cds.unistra.fr/simbad/",
      "access": "https://simbad.cds.unistra.fr/simbad/sim-tap"
    }
  ],
  "acknowledgement": "This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration.",
  "acknowledgement_source": "https://irsa.ipac.caltech.edu/Missions/spherex.html",
  "software": [
    "FastAPI",
    "Astropy",
    "Astroquery/PyVO",
    "reproject",
    "NumPy",
    "OpenCV",
    "Matplotlib",
    "Pillow"
  ]
}
