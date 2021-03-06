all: doc

include links.mk

links.mk: links
	awk '{ print("LINKS +=", $$1); print($$1, ":"); print("\tmkdir -p $$(shell dirname ", $$1, ")"); print("\tln -sf", $$2, $$1)}' $^ > $@

MANPAGES = $(patsubst bin/%, man/%.1, $(shell grep -rl =head1 bin/*))

all: $(LINKS) $(MANPAGES)

.PHONY: spec check test

checkdeps:
	@if which dpkg-checkbuilddeps >/dev/null && which grep-dctrl >/dev/null; then dpkg-checkbuilddeps -d "$$(grep-dctrl -n -s Depends . debian/control | grep -v '\$$')"; fi

spec:
	@./test/banner 'Ruby unit tests'
	@echo rspec --color
	@rspec --color || (if [ -n "$(DISPLAY)" ]; then notify-send --urgency=critical --expire-time=5 "FAILED!!!"; fi; false)

functional-tests:
	@./test/banner 'Functional tests'
	test/runall.sh
	$(RM) -v test/erl_crash.dump

backends = $(shell ls -1 backends/)
test_backends = $(patsubst %, test-%, $(backends))
.PHONY: $(test_backends)

test-backends: $(test_backends)

$(test_backends): test-% : backends/%/test-package
	@./test/banner "Test backend $*"
	./bin/debci test -b $* test/fake-package/ > log/test-$*.log 2>&1 # local source package
	./bin/debci test -b $* ruby-defaults      > log/test-$*.log 2>&1 # source package from archive

deb:
	mkdir -p tmp/deb
	rm -rf tmp/deb/debci*
	DEB_BUILD_OPTIONS=nocheck gbp buildpackage --git-ignore-branch --git-export-dir=tmp/deb
	cd tmp/deb && dpkg-scanpackages . > Packages
	@echo
	@echo "Debian packages available in tmp/deb/!"

ruby-console:
	irb -Ilib -rdebci

check: all check-ui-and-docs spec functional-tests

check-ui-and-docs: all
	test -d public/doc
	test -f public/doc/index.html
	test -L public/doc/js/jquery.js -a -f public/doc/js/jquery.js
	test -L public/jquery.js -a -f public/jquery.js
	test -L public/bootstrap

test: check

doc: public/doc/index.html public/doc/architecture.svg

public/doc/index.html public/doc/jq/jquery.js: README.md docs/*.md $(shell find lib -name '*.rb')
	$(RM) public/doc/js/jquery.js
	yardoc --markup markdown --output-dir public/doc --main README.md lib - $^
	ln -sf ../../jquery.js public/doc/js/jquery.js

public/doc/architecture.svg: docs/architecture.svg
	cp docs/architecture.svg public/doc/

$(MANPAGES): man/%.1: bin/% man
	pod2man --center "" --release "" --section=1 --utf8 $< $@

man:
	mkdir $@

.PHONY: tags

tags:
	ctags -R --exclude=data --exclude=chroots --exclude='public/jquery*' --exclude=public/bootstrap .

clean:
	$(RM) -rf $(generated) tags public/doc links.mk $(LINKS) man/
