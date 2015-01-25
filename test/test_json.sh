#!/bin/sh

. $(dirname $0)/test_helper.sh

test_valid_json() {
  start_worker
  debci batch
  wait_for_results

  ruby <<EOF || fail 'found invalid JSON files'
    require 'json'
    failed = 0
    json = Dir.glob(File.join('${debci_data_basedir}', '**/*.json'))
    if json.size == 0
      puts "Found no JSON files to check"
      exit(1)
    end
    json.each do |file|
      begin
        JSON.parse(File.read(file))
      rescue JSON::ParserError => exc
        puts "#{file} contains invalid JSON: #{exc.message}"
        failed += 1
      end
    end
    exit(failed)
EOF
}

. shunit2
