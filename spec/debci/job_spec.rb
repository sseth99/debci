require 'spec_helper'

require 'debci/job'

describe Debci::Job do

  it 'sets created_at' do
    job = Debci::Job.create
    expect(job.created_at).to_not be_nil
  end

end
