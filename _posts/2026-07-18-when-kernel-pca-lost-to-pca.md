---
layout: post
title: When Kernel PCA Lost to Plain PCA
date: 2026-07-18
description: I spent weeks implementing a fancier algorithm for face recognition, and the boring baseline tied it. The story of how the win evaporated — and the chart that finally explained why.
excerpt: The fancy method won by 7 points. Then I made the test set bigger, and the win disappeared. This is a story about negative results, and why they need better experiments than positive ones.
---

<script>
  window.MathJax = { options: { skipHtmlTags: ['script','noscript','style','textarea','pre','code'] } };
</script>
<script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>

I spent a few weeks this summer implementing Kernel PCA from scratch and pitting it against plain old PCA on face recognition. The paper I was following reported the kernel method cutting test error roughly *in half*. My version, at first, won by seven points.

Then I made the test set bigger, and the win disappeared.

This post is the story of that disappearing act — what I tried, what broke, and the chart that finally made sense of it.

## The setup

PCA is the workhorse of classic face recognition: flatten each image into a vector, find the directions of maximum variance ("eigenfaces"), project, and classify by nearest neighbor. It's linear, fast, and decades old.

Kernel PCA (KPCA) is the nonlinear upgrade. Instead of working with raw pixels, it implicitly maps images into a high-dimensional feature space and does PCA *there* — without ever computing the map, because every step reduces to kernel evaluations $$\kappa(x_i, x_j)$$. With a Gaussian kernel, one hyperparameter rules everything: the width $$\sigma$$. I used the standard heuristic from the literature, $$\sigma = 5 \cdot \text{mean}(d^{NN})$$ — five times the average nearest-neighbor distance in the training set.

Faces under changing lighting and expression *should* live on a curved manifold. A nonlinear method *should* help. That was the theory.

## The seven-point win that wasn't

My first experiments used the small Yale Faces dataset: 15 people, 11 images each. Train on 5 images per person, test on... well, that's where the trouble started. My original split tested on **one image per person** — 15 test images total.

With 15 test images, every single prediction moves accuracy by 6.7 points. My "KPCA beats PCA by 7 points" result was literally *one photo* classified differently. Run the same experiment with a different random seed and the winner flipped.

So I tightened everything, one screw at a time:

- **Use all 90 remaining images as the test set**, not 15.
- **Average over 20 random splits** and report mean ± std, because single-split results swung by ±7 points on their own.
- **Stop choosing the number of components on the test set.** Sweeping $$k$$ and reporting the best test accuracy is quiet cheating — I added a validation split to choose $$k$$ honestly, and measured exactly how much the cheating had been worth (about 3 points on this small dataset).

After all that, here's Yale Faces:

![PCA vs KPCA accuracy on Yale Faces]({{ '/image/kpca/kpca_968ecc69_0.png' | relative_url }})

Two curves, one on top of the other: **75.8 ± 3.0 for PCA, 75.7 ± 3.0 for KPCA.** A tie, documented to death.

I repeated the whole thing on a much larger dataset (Extended Yale B, 28 subjects, thousands of images). Same story at every training size — the error bars overlap completely:

![PCA vs KPCA by training size on Extended Yale B]({{ '/image/kpca/pca_kpca_compare_ntrain_0.png' | relative_url }})

And the honest-vs-optimistic check, in one picture — choosing $$k$$ on validation instead of the test set costs a few points of vanity, but changes nothing about the ranking:

![Honest vs optimistic evaluation]({{ '/image/kpca/val_selection_0.png' | relative_url }})

## The chart that explained everything

For a while this bugged me. The math says KPCA is strictly more expressive. Where did the nonlinearity *go*?

The answer turned out to be hiding in the hyperparameter heuristic. When $$\sigma$$ is much larger than the typical distance $$d$$ between points, the Gaussian kernel flattens out:

$$\exp\!\left(-\frac{d^2}{2\sigma^2}\right) \approx 1 - \frac{d^2}{2\sigma^2}$$

— which is *linear* in the squared distance. In that regime, KPCA quietly degenerates into ordinary PCA. And the recommended $$5\times$$ rule, on high-dimensional face images, produces exactly that regime.

You can watch it happen. Here is the kernel matrix at one, five, and ten times the nearest-neighbor distance:

![Kernel matrix at three widths]({{ '/image/kpca/pca_kpca_analysis_0.png' | relative_url }})

At $$1\times$$ there's real structure — blocks, contrast, information. At $$5\times$$ (the recommended setting!) the contrast has mostly washed out. The kernel isn't failing to be clever; it has been *configured* not to be. I wasn't comparing PCA against Kernel PCA. I was comparing PCA against an expensive implementation of PCA.

There's a second, deeper reason too: with 77,760 pixels per image and only ~150 training samples, the data is so high-dimensional that everything is nearly linearly separable anyway. Nonlinear methods have nothing left to add. High-dimensional data is, for most practical purposes, linear data.

## Where the kernel actually earns its keep

To make sure my implementation wasn't just broken, I ran the classic synthetic benchmarks — concentric rings, two moons, XOR clusters — where the structure genuinely is nonlinear and the dimension is low. There, KPCA is dramatic: compressing to a *single* component, it beats PCA by +34 points on rings and +56 on XOR, because one nonlinear coordinate can encode "radius" or "$$x_1 x_2$$" where no straight line can.

My favorite find of the whole project came from that side quest. For clustering XOR data, switching the polynomial kernel from $$(x^\top y + 1)^2$$ to $$(x^\top y)^2$$ — deleting a single constant — took K-Means from ARI 0.25 (garbage) to 1.00 (perfect). The innocent-looking "+1" smuggles linear features into the feature space, and their variance drowns out the one term that matters. Kernel choice matters down to details you would never think to question.

## What I'm keeping from this

1. **Negative results need better experiments than positive ones.** With a tiny test set and test-set model selection, I could have honestly *believed* either method was winning. The tie only became credible after multi-seed averaging and a real validation split.
2. **Check whether your nonlinear method is actually nonlinear at the settings you run it.** A Gaussian kernel with a huge $$\sigma$$ is PCA with extra steps.
3. **The boring baseline earned its reputation.** For high-dimensional cropped face images, plain PCA is fast, simple, and — as far as I can measure — unbeatable by its kernelized descendant.

All the code, notebooks, and the full technical report live in my [ML_research repository](https://github.com/crushWu8/ML_research). A more formal write-up of the same study is on my [academic page](https://crushwu8.github.io/posts/2026/07/kpca-vs-pca-face-recognition/).
