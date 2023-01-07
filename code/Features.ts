import { imemo, linkManyAftertext } from "./utils"
import { LanguagePageTemplate } from "./LanguagePage"
import { cleanAndRightShift, getIndefiniteArticle } from "./utils"

const path = require("path")

const { jtree } = require("jtree")
const { TreeNode } = jtree
const { TreeBaseFile } = require("jtree/products/treeBase.node.js")
const { TreeBaseFolder } = require("jtree/products/treeBase.node.js")

const databaseFolder = path.join(__dirname, "..", "database")

const lodash = require("lodash")

class FeaturePageTemplate extends LanguagePageTemplate {
  toScroll() {
    const { file } = this
    const { title, id } = file
    return `import header.scroll

title ${title}

title ${title} - language feature
 hidden

html
 <a class="prevLang" href="${this.prevPage}">&lt;</a>
 <a class="nextLang" href="${this.nextPage}">&gt;</a>

viewSourceUrl ${this.sourceUrl}

startColumns 4

${this.exampleSection}

${this.image}

## Our definition
${this.descriptionSection}

${this.factsSection}

endColumns

keyboardNav ${this.prevPage} ${this.nextPage}

import ../footer.scroll
`.replace(/\n\n\n+/g, "\n\n")
  }

  get facts() {
    const { file } = this
    const { title, website } = file

    const facts = []

    const wikipediaLink = file.get("wikipedia")
    const wikiLink = wikipediaLink ? wikipediaLink : ""
    if (wikiLink) facts.push(`${title} Wikipedia page\n ${wikiLink}`)

    const demoVideo = file.get("demoVideo")
    if (demoVideo) facts.push(`Video demo of ${title}\n ${demoVideo}`)

    const wpRelated = file.get("wikipedia related")
    const seeAlsoLinks = wpRelated ? wpRelated.split(" ") : []
    const related = file.get("related")
    if (related) related.split(" ").forEach(id => seeAlsoLinks.push(id))

    if (seeAlsoLinks.length)
      facts.push(
        "See also: " +
          `(${seeAlsoLinks.length} related languages)` +
          seeAlsoLinks.map(link => this.makeATag(link)).join(", ")
      )

    const { otherReferences } = file

    const semanticScholarReferences = otherReferences.filter(link =>
      link.includes("semanticscholar")
    )
    const nonSemanticScholarReferences = otherReferences.filter(
      link => !link.includes("semanticscholar")
    )

    if (semanticScholarReferences.length)
      facts.push(
        `Read more about ${title} on Semantic Scholar: ${linkManyAftertext(
          semanticScholarReferences
        )}`
      )
    if (nonSemanticScholarReferences.length)
      facts.push(
        `Read more about ${title} on the web: ${linkManyAftertext(
          nonSemanticScholarReferences
        )}`
      )

    facts.push(
      `HTML of this page generated by <a href="https://github.com/breck7/pldb/blob/main/code/Features.ts">Features.ts</a>`
    )
    return facts
  }

  get description() {
    const { title } = this.file
    const isOrAre = title.endsWith("s") ? "are" : "is"

    return `${title} ${isOrAre} a ${this.typeLink}.`
  }

  get prevPage() {
    return this.file.getPrevious().permalink
  }

  get nextPage() {
    return this.file.getNext().permalink
  }

  get typeLink() {
    return `<a href="../lists/features.html">language feature</a>`
  }

  get sourceUrl() {
    return `https://github.com/breck7/pldb/blob/main/database/features/${this.id}.feature`
  }

  get exampleSection() {
    const { file } = this
    const { title, featurePath } = file

    const positives = file.languagesWithThisFeature
    const negatives = file.languagesWithoutThisFeature

    const examples = positives
      .filter(file => file.getNode(featurePath).length)
      .map(file => {
        return {
          id: file.id,
          title: file.title,
          example: file.getNode(featurePath).childrenToString()
        }
      })

    const grouped = lodash.groupBy(examples, "example")

    const examplesText = Object.values(grouped)
      .map((group: any) => {
        const id = file.id
        const links = group
          .map(hit => `<a href="../languages/${hit.id}.html">${hit.title}</a>`)
          .join(", ")
        return `codeWithHeader Example from ${links}:
 ${cleanAndRightShift(lodash.escape(group[0].example), 1)}`
      })
      .join("\n\n")

    const negativeText = negatives.length
      ? `* Languages *without* ${title} include ${negatives
          .map(
            file => `<a href="../languages/${file.permalink}">${file.title}</a>`
          )
          .join(", ")}

`
      : ""

    return (
      examplesText +
      negativeText +
      `* Languages *with* ${title} include ${positives
        .map(
          file => `<a href="../languages/${file.permalink}">${file.title}</a>`
        )
        .join(", ")}

`
    )
  }
}

class FeatureFile extends TreeBaseFile {
  @imemo
  get _getLanguagesWithThisFeatureResearched() {
    const featureKeyword = this.get("featureKeyword")

    return this.base.topLanguages.filter(file =>
      file.getNode("features")?.has(featureKeyword)
    )
  }

  get otherReferences() {
    return this.findNodes("reference").map(line => line.getContent())
  }

  @imemo
  get title(): string {
    return this.get("title") || this.id
  }

  get featurePath() {
    return `features ${this.get("featureKeyword")}`
  }

  getAll(keyword) {
    return this.findNodes(keyword).map(i => i.getContent())
  }

  get base() {
    return this.getParent().languageFolder
  }

  get languagesWithThisFeature() {
    const { featurePath } = this
    return this._getLanguagesWithThisFeatureResearched.filter(
      file => file.get(featurePath) === "true"
    )
  }

  get languagesWithoutThisFeature() {
    const { featurePath } = this
    return this._getLanguagesWithThisFeatureResearched.filter(
      file => file.get(featurePath) === "false"
    )
  }
}

class FeaturesFolder extends TreeBaseFolder {
  static getFolder(languageFolder): FeaturesFolder {
    const featuresFolder = new FeaturesFolder()
      .setDir(path.join(databaseFolder, "features"))
      .setGrammarDir(path.join(databaseFolder, "grammar"))
    featuresFolder.languageFolder = languageFolder
    return featuresFolder.loadFolder()
  }

  createParser() {
    return new TreeNode.Parser(FeatureFile)
  }
}

export { FeaturesFolder, FeatureFile, FeaturePageTemplate }
