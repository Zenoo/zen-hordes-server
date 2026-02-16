# Changelog

## [1.0.20](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.19...v1.0.20) (2026-02-16)


### Bug Fixes

* Test deployment ([39e329a](https://github.com/Zenoo/zen-hordes-server/commit/39e329a1e546c14c41ee05bb45c08c396b9ae16d))

## [1.0.19](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.18...v1.0.19) (2026-02-16)


### Bug Fixes

* Remove worker handling ([1529fcb](https://github.com/Zenoo/zen-hordes-server/commit/1529fcb18e3ae670636ffc3038d9eb327193a4e2))

## [1.0.18](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.17...v1.0.18) (2026-02-16)


### Bug Fixes

* Display vesion in logs ([f45ea84](https://github.com/Zenoo/zen-hordes-server/commit/f45ea84815f590fdafede52fe54685f669a3cb64))

## [1.0.17](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.16...v1.0.17) (2026-02-16)


### Bug Fixes

* Trust proxies for rate limiter ([0ce9b22](https://github.com/Zenoo/zen-hordes-server/commit/0ce9b22902273888a2ca43e3d93c2bb4d1a7a9be))

## [1.0.16](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.15...v1.0.16) (2026-02-15)


### Bug Fixes

* Create user when adding new citizen ([667a5fa](https://github.com/Zenoo/zen-hordes-server/commit/667a5fa8f9f592ce8945ef9c81cd30b8c1e83276))

## [1.0.15](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.14...v1.0.15) (2026-02-15)


### Bug Fixes

* Check if user is in town before accessing data + Test without mocking local methods ([2a5fbba](https://github.com/Zenoo/zen-hordes-server/commit/2a5fbbac7944b36ef0dbfa14a4559ea4aa611aa4))
* Send logs to Discord ([2aa2965](https://github.com/Zenoo/zen-hordes-server/commit/2aa29651ca3ef9c205ba4329bf6d29d97fb644b5))

## [1.0.14](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.13...v1.0.14) (2026-02-14)


### Bug Fixes

* Missing x,y city data on update ([72b2ae3](https://github.com/Zenoo/zen-hordes-server/commit/72b2ae3f2c6bdd77f513e781bea8bd8235e767ee))

## [1.0.13](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.12...v1.0.13) (2026-02-14)


### Bug Fixes

* Wrong scav radar calculation in cache ([c653ca9](https://github.com/Zenoo/zen-hordes-server/commit/c653ca9b609d8a6694cbd5d2fcafa06769580bb2))

## [1.0.12](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.11...v1.0.12) (2026-02-13)


### Bug Fixes

* Add reminders for next steps ([a090310](https://github.com/Zenoo/zen-hordes-server/commit/a09031080bdc58d555882948bb83c59fdddb7a0e))
* Update adjascent zones updated tag ([bf4233e](https://github.com/Zenoo/zen-hordes-server/commit/bf4233e270aa355021035e5893f2276ca542861c))
* Upsert scav zones ([3fb013a](https://github.com/Zenoo/zen-hordes-server/commit/3fb013a1a6b52cab72470222fd1a612033208225))

## [1.0.11](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.10...v1.0.11) (2026-02-12)


### Bug Fixes

* Display current version on GET / ([670a8a1](https://github.com/Zenoo/zen-hordes-server/commit/670a8a133442f9c3b3a6e6a83004aaec0e6a0666))

## [1.0.10](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.9...v1.0.10) (2026-02-12)


### Bug Fixes

* Use PAT for version control ([dc16a89](https://github.com/Zenoo/zen-hordes-server/commit/dc16a898dc98b3f96dd3ba916b8c521a6a0df4e3))

## [1.0.9](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.8...v1.0.9) (2026-02-11)


### Bug Fixes

* Deploy condition ([37ecb1a](https://github.com/Zenoo/zen-hordes-server/commit/37ecb1a55be085b2b5b25dc9206f999c3427b87d))

## [1.0.8](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.7...v1.0.8) (2026-02-11)


### Bug Fixes

* Auto deploy server ([9ebdfdc](https://github.com/Zenoo/zen-hordes-server/commit/9ebdfdc2cfea7a21525bbeda59a402b44a822cbb))
* Build errors ([ff1985f](https://github.com/Zenoo/zen-hordes-server/commit/ff1985fbbfbae38eb5fa3e39bff6dc068663016c))
* Generate prisma types before build ([ed7761f](https://github.com/Zenoo/zen-hordes-server/commit/ed7761f5a5ef0108c09245af11ae0242ee99b5bc))
* Skip husky in prod ([6f240f0](https://github.com/Zenoo/zen-hordes-server/commit/6f240f0f08cb4ceb0e5233384cd754bad29ea5a3))
* Wrong scav direction ([f6bd7af](https://github.com/Zenoo/zen-hordes-server/commit/f6bd7af2213de2049f298611bffa885de5c491e9))

## [1.0.7](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.6...v1.0.7) (2026-02-10)


### Bug Fixes

* Include citizen names in town request ([1c0f7ce](https://github.com/Zenoo/zen-hordes-server/commit/1c0f7cef22d8fbdc892f6f878085d16f8465f549))
* Store zone coords relative to the city ([1607adf](https://github.com/Zenoo/zen-hordes-server/commit/1607adf9c19442d30ef2a2ccf865e91197ac1597))
* Update tests after schema update ([70baf5f](https://github.com/Zenoo/zen-hordes-server/commit/70baf5f6a8b7061d0bbe6986842fc11af721e5d7))

## [1.0.6](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.5...v1.0.6) (2026-02-04)


### Bug Fixes

* Fetch town from MH when missing in /town ([8979335](https://github.com/Zenoo/zen-hordes-server/commit/897933523bb3567f8fba5fba9344f682d7d479ba))
* Restore hourly updates ([177a383](https://github.com/Zenoo/zen-hordes-server/commit/177a383e0d8e88f6161c616fadf4f48510056440))
* Update town every hour when called ([c51e559](https://github.com/Zenoo/zen-hordes-server/commit/c51e5599e5881dc3e35f9b9cf47feed050cb6c5d))

## [1.0.5](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.4...v1.0.5) (2026-01-30)


### Bug Fixes

* Include instructions for every prompt ([78bff05](https://github.com/Zenoo/zen-hordes-server/commit/78bff05aa413c138ff4dd74d93bfedab45b19e02))
* Simplify copilot instructions ([da97ab8](https://github.com/Zenoo/zen-hordes-server/commit/da97ab810a24a1d54df2ca77bda080cc17aaf4ba))
* Update scripts for katal deployment ([89eaf6f](https://github.com/Zenoo/zen-hordes-server/commit/89eaf6f4edb3ed7d089ef512a3f6c09a6bd04475))

## [1.0.4](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.3...v1.0.4) (2026-01-28)


### Bug Fixes

* Call MH api only once ([1c945ce](https://github.com/Zenoo/zen-hordes-server/commit/1c945ce39ac4a2e81ecb8eae8a543795f2484f16))

## [1.0.3](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.2...v1.0.3) (2026-01-28)


### Bug Fixes

* Add tests ([1d7cdff](https://github.com/Zenoo/zen-hordes-server/commit/1d7cdff7f1e42274873d52922ac5510d9d0ba2fb))

## [1.0.2](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.1...v1.0.2) (2026-01-28)


### Bug Fixes

* Update caches ([451846a](https://github.com/Zenoo/zen-hordes-server/commit/451846a1a6570ac003176730fc0cef9d1a6119eb))

## [1.0.1](https://github.com/Zenoo/zen-hordes-server/compare/v1.0.0...v1.0.1) (2026-01-28)


### Bug Fixes

* Missing citizen position ([53a41d6](https://github.com/Zenoo/zen-hordes-server/commit/53a41d6e0f2138c86afbf7cf891e4a44b8c7805f))
* Update citizen position on town update ([6c7c4be](https://github.com/Zenoo/zen-hordes-server/commit/6c7c4bedac63760a0b4f9a21d68a936452e974e7))

## 1.0.0 (2026-01-28)


### Features

* Automatic release ([5c5398f](https://github.com/Zenoo/zen-hordes-server/commit/5c5398fa7b281765efe09ee42341a9804736de66))
* Base POST /update structure ([18b04d9](https://github.com/Zenoo/zen-hordes-server/commit/18b04d95481fb6b5d29854b8eb8c32409d7bb64e))
* maps and town data ([8e0c8a4](https://github.com/Zenoo/zen-hordes-server/commit/8e0c8a4f24312180e6f488707327b012e5a955ff))
* Populate DB with user/town data ([a1843fd](https://github.com/Zenoo/zen-hordes-server/commit/a1843fd45bb7eefab890036c8e2a50ccdb0c574d))


### Bug Fixes

* Cache + rate limit + compress ([be06dc9](https://github.com/Zenoo/zen-hordes-server/commit/be06dc9c9e6de03865bd391ce0ebf9c7cc343e2b))
* Lint + Swagger ([4d834bd](https://github.com/Zenoo/zen-hordes-server/commit/4d834bd8b36a898263deede4121b34c2771e649e))
